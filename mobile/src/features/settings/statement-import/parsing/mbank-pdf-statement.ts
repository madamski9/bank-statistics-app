import {
  inferTransactionType,
  parseStatementAmount,
  type StatementParseResult,
  type StatementRow,
} from './statement-parser';

const amountPattern = String.raw`-?\d{1,3}(?: \d{3})*,\d{2}`;
const datePattern = String.raw`\d{4}-\d{2}-\d{2}`;
const valuePairPattern = new RegExp(`^(${amountPattern}) (${amountPattern})$`);
const headerPattern = new RegExp(`^(${datePattern}) (${datePattern}) (.+)$`);
const inlinePairPattern = new RegExp(`^(.*?) (${amountPattern}) (${amountPattern})$`);
const leadingDatesPattern = new RegExp(`^((?:${datePattern} )+)(.*)$`);
const openingBalancePattern = new RegExp(`^Saldo początkowe: (${amountPattern})$`);
const closingBalancePattern = new RegExp(`^Saldo końcowe: (${amountPattern})$`);
const currencyPattern = /^Waluta ([A-Z]{3})$/;
const transactionDatePattern = new RegExp(`\\s*DATA TRANSAKCJI: (${datePattern})\\s*$`);
const phoneDetailPattern = /\s+Od: .*$/;
const accountNumberPattern = /^[\d ]{16,}$/;
const columnHeading = 'Opis operacji Kwota Saldo po';
const pageMarkerPattern = /^Strona : (\d+) \/ (\d+)$/;
const operationCountPattern = /^Łącznie (\d+)(?: |$)/;

const pageChromePatterns = [pageMarkerPattern, /^Data$/, /^księgowania$/, /^operacji$/, new RegExp(`^${columnHeading}$`)];

interface PendingOperation {
  operationDate: string;
  operation: string;
  lines: string[];
  signedMinor?: number;
  balanceMinor?: number;
}

interface Statement {
  currency: string;
  openingBalanceMinor: number;
  closingBalanceMinor: number | null;
  operationCount: number | null;
  operations: PendingOperation[];
}

function signed(amount: string): number | null {
  const isNegative = amount.startsWith('-');
  const minor = parseStatementAmount(isNegative ? amount.slice(1) : amount);

  if (minor === null) {
    return amount.replace(/[^1-9]/g, '') === '' ? 0 : null;
  }

  return isNegative ? -minor : minor;
}

function normalizedLines(text: string): string[] {
  return text
    .normalize('NFC')
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line !== '');
}

function sharedDatesOf(line: string): string[] | null {
  const match = leadingDatesPattern.exec(`${line} `);

  if (match === null) {
    return null;
  }

  const dates = match[1].trim().split(' ');
  const rest = match[2].trim();

  if (rest !== '' && rest !== columnHeading && dates.length <= 2) {
    return null;
  }

  return dates;
}

function hasCompletePages(lines: string[]): boolean {
  const pages = lines.flatMap((line) => {
    const match = pageMarkerPattern.exec(line);

    return match === null ? [] : [{ number: Number(match[1]), total: Number(match[2]) }];
  });
  const [first] = pages;

  return first === undefined || (
    pages.length === first.total &&
    pages.every((page, index) => page.number === index + 1 && page.total === first.total)
  );
}

function statementOf(lines: string[]): Statement | 'unrecognized' | 'inconsistent' {
  let currency = 'PLN';
  let operationCount: number | null = null;
  let statement: Statement | null = null;
  let open: PendingOperation | null = null;
  const sharedDates: string[] = [];

  for (const line of lines) {
    if (statement === null) {
      const count = operationCountPattern.exec(line);

      if (count !== null) {
        operationCount = Number(count[1]);
      }

      const currencyMatch = currencyPattern.exec(line);

      if (currencyMatch !== null) {
        currency = currencyMatch[1];
      }

      const opening = openingBalancePattern.exec(line);

      if (opening !== null) {
        statement = {
          currency,
          openingBalanceMinor: signed(opening[1]) ?? 0,
          closingBalanceMinor: null,
          operationCount,
          operations: [],
        };
      }
      continue;
    }

    const closing = closingBalancePattern.exec(line);

    if (closing !== null) {
      statement.closingBalanceMinor = signed(closing[1]);
      break;
    }

    if (pageChromePatterns.some((pattern) => pattern.test(line))) {
      continue;
    }

    const pair = valuePairPattern.exec(line);

    if (pair !== null) {
      if (open === null) {
        return 'inconsistent';
      }

      open.signedMinor = signed(pair[1]) ?? undefined;
      open.balanceMinor = signed(pair[2]) ?? undefined;
      open = null;
      continue;
    }

    if (open !== null) {
      open.lines.push(line);
      continue;
    }

    const dates = sharedDatesOf(line);

    if (dates !== null) {
      if (dates.length % 2 !== 0) {
        return 'inconsistent';
      }

      sharedDates.push(...dates);
      continue;
    }

    const header = headerPattern.exec(line);
    let operationDate: string;
    let body: string;

    if (header !== null) {
      operationDate = header[2];
      body = header[3];
    } else {
      const [, shared] = sharedDates.splice(0, 2);

      if (shared === undefined) {
        return 'inconsistent';
      }

      operationDate = shared;
      body = line;
    }

    const inline = inlinePairPattern.exec(body);
    const operation: PendingOperation = {
      operationDate,
      operation: inline === null ? body : inline[1],
      lines: [],
    };

    statement.operations.push(operation);

    if (inline === null) {
      open = operation;
    } else {
      operation.signedMinor = signed(inline[2]) ?? undefined;
      operation.balanceMinor = signed(inline[3]) ?? undefined;
    }
  }

  if (statement === null) {
    return 'unrecognized';
  }

  return open !== null || sharedDates.length > 0 ? 'inconsistent' : statement;
}

function balances(statement: Statement): boolean {
  if (statement.operationCount !== null && statement.operations.length !== statement.operationCount) {
    return false;
  }

  let balance = statement.openingBalanceMinor;

  for (const operation of statement.operations) {
    if (operation.signedMinor === undefined || operation.balanceMinor === undefined) {
      return false;
    }

    balance += operation.signedMinor;

    if (balance !== operation.balanceMinor) {
      return false;
    }
  }

  return statement.closingBalanceMinor === balance;
}

function partyOf(operation: PendingOperation): string | undefined {
  const isCard = /\bKARTY\b/.test(operation.operation);
  const [first] = operation.lines.filter((line) => !accountNumberPattern.test(line));

  if (first === undefined) {
    return undefined;
  }

  let party = first.replace(transactionDatePattern, '').replace(phoneDetailPattern, '');
  party = party.split(', ')[0];

  if (isCard) {
    const withoutLocation = party.replace(/\s*\/[^/]*\/?$/, '');
    party = withoutLocation === '' ? party : withoutLocation;
  }

  const trimmed = party.trim().slice(0, 80);

  return trimmed === '' ? undefined : trimmed;
}

function transactionTypeOf(operation: PendingOperation, direction: StatementRow['direction']) {
  if (/\bP2P\b/.test(operation.operation)) {
    return direction === 'expense' ? 'outgoingTransfer' : 'incomingTransfer';
  }

  return inferTransactionType(operation.operation, direction) ?? inferTransactionType(operation.lines.join(' '), direction);
}

function rowOf(operation: PendingOperation, signedMinor: number, currency: string): StatementRow {
  const transactionDate = operation.lines
    .map((line) => transactionDatePattern.exec(line)?.[1])
    .find((date) => date !== undefined);
  const direction = signedMinor < 0 ? 'expense' : 'income';
  const party = partyOf(operation);
  const transactionType = transactionTypeOf(operation, direction);

  return {
    date: transactionDate ?? operation.operationDate,
    direction,
    amountMinor: Math.abs(signedMinor),
    currency,
    ...(party === undefined ? {} : { party }),
    ...(transactionType === undefined ? {} : { transactionType }),
  };
}

export function parseMbankPdfStatement(text: string): StatementParseResult {
  if (text.trim() === '') {
    return { ok: false, problem: 'empty' };
  }

  const lines = normalizedLines(text);
  const statement = statementOf(lines);

  if (statement === 'unrecognized' || statement === 'inconsistent') {
    return { ok: false, problem: statement };
  }

  if (!hasCompletePages(lines) || !balances(statement)) {
    return { ok: false, problem: 'inconsistent' };
  }

  const rows = statement.operations.flatMap((operation) =>
    operation.signedMinor === undefined || operation.signedMinor === 0
      ? []
      : [rowOf(operation, operation.signedMinor, statement.currency)],
  );
  const skippedCount = statement.operations.length - rows.length;

  if (rows.length === 0) {
    return { ok: false, problem: 'noTransactions' };
  }

  return { ok: true, bank: 'mbank', rows, skippedCount };
}
