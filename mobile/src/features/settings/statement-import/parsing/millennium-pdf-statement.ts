import {
  inferTransactionType,
  parseStatementAmount,
  type StatementParseResult,
  type StatementRow,
} from './statement-parser';

const amountPattern = String.raw`\d{1,3}(?:\.\d{3})*,\d{2}`;
const valuePairPattern = new RegExp(`^(${amountPattern})(-?) (${amountPattern})(-?)$`);
const headerPattern = /^(\d{4}-\d{2}-\d{2}) (\d{4}-\d{2}-\d{2}) (.+)$/;
const inlinePairPattern = new RegExp(`^(.*?) (${amountPattern})(-?) (${amountPattern})(-?)$`);
const openingBalancePattern = new RegExp(`^SALDO POCZĄTKOWE: (${amountPattern})(-?)$`);
const currencyPattern = /WALUTA: ([A-Z]{3})\b/;
const purchaseDatePattern = /^Dnia: (\d{4}-\d{2}-\d{2})\b/;
const originalAmountPattern = /^Kwota transakcji: (\d+(?:\.\d{1,2})?) ([A-Z]{3})\b/;
const namedPartyPattern = /^(?:Nadawca|Odbiorca):(.+?)(?: Tytułem:.*)?$/;

const operationNames = [
  'PŁATNOŚĆ BLIK W INTERNECIE',
  'PŁATNOŚĆ BLIK',
  'PŁATNOŚĆ KARTĄ',
  'PRZELEW NA NUMER TELEFONU',
  'PRZELEW WYCHODZĄCY',
  'PRZELEW PRZYCHODZĄCY',
  'PRZELEW WŁASNY',
  'PRZELEW NA RACHUNEK',
  'WYPŁATA Z BANKOMATU',
  'WYPŁATA BLIK',
  'WYPŁATA',
  'WPŁATA',
  'ZLECENIE STAŁE',
  'POLECENIE ZAPŁATY',
  'KAPITALIZACJA ODSETEK',
  'OPŁATA',
  'PROWIZJA',
  'ZWROT',
];

const pageChromePatterns = [
  /^www\.bankmillennium\.pl\b/,
  /^strona \d+ z \d+$/,
  /^DATA$/,
  /^KSIĘG\.$/,
  /^WAL\. OPIS TRANSAKCJI/,
];

const detailPrefixes = [
  'Z R-ku:',
  'Na R-k:',
  'Karta:',
  'Dnia:',
  'Kwota transakcji:',
  'Na nr tel.',
  'Od:',
  'DATA NADANIA',
  'ZLECENIODAWCA:',
];

const sectionEndPatterns = [/^SUMA UZNAŃ/, /^SUMA OBCIĄŻEŃ/, /^SALDO KOŃCOWE/];

interface ValuePair {
  signedMinor: number;
  balanceMinor: number;
}

interface PendingOperation {
  bookingDate: string;
  operation: string;
  lines: string[];
  pair?: ValuePair;
}

interface Section {
  currency: string;
  openingBalanceMinor: number;
  operations: PendingOperation[];
  pairs: ValuePair[];
}

function signed(amount: string, minus: string): number | null {
  const minor = parseStatementAmount(amount);

  if (minor === null) {
    return amount.replace(/[^1-9]/g, '') === '' ? 0 : null;
  }

  return minus === '-' ? -minor : minor;
}

function pairOf(value: string, valueMinus: string, balance: string, balanceMinus: string): ValuePair | null {
  const signedMinor = signed(value, valueMinus);
  const balanceMinor = signed(balance, balanceMinus);

  return signedMinor === null || balanceMinor === null || signedMinor === 0
    ? null
    : { signedMinor, balanceMinor };
}

function splitOperation(text: string): { operation: string; rest: string } {
  const known = operationNames.find((name) => text === name || text.startsWith(`${name} `));

  if (known === undefined) {
    return { operation: text, rest: '' };
  }

  return { operation: known, rest: text.slice(known.length).trim() };
}

function normalizedLines(text: string): string[] {
  return text
    .normalize('NFC')
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line !== '');
}

function sectionsOf(lines: string[]): Section[] {
  const sections: Section[] = [];
  let currency = 'PLN';
  let section: Section | null = null;

  for (const line of lines) {
    const currencyMatch = currencyPattern.exec(line);

    if (currencyMatch !== null) {
      currency = currencyMatch[1];
    }

    const opening = openingBalancePattern.exec(line);

    if (opening !== null) {
      section = {
        currency,
        openingBalanceMinor: signed(opening[1], opening[2]) ?? 0,
        operations: [],
        pairs: [],
      };
      sections.push(section);
      continue;
    }

    if (section === null) {
      continue;
    }

    if (sectionEndPatterns.some((pattern) => pattern.test(line))) {
      section = null;
      continue;
    }

    if (pageChromePatterns.some((pattern) => pattern.test(line))) {
      continue;
    }

    const pair = valuePairPattern.exec(line);

    if (pair !== null) {
      const parsed = pairOf(pair[1], pair[2], pair[3], pair[4]);

      if (parsed !== null) {
        section.pairs.push(parsed);
      }
      continue;
    }

    const header = headerPattern.exec(line);

    if (header !== null) {
      const inline = inlinePairPattern.exec(header[3]);
      const body = inline === null ? header[3] : inline[1];
      const { operation, rest } = splitOperation(body);
      const pendingPair = inline === null ? null : pairOf(inline[2], inline[3], inline[4], inline[5]);

      section.operations.push({
        bookingDate: header[1],
        operation,
        lines: rest === '' ? [] : [rest],
        ...(pendingPair === null ? {} : { pair: pendingPair }),
      });
      continue;
    }

    section.operations[section.operations.length - 1]?.lines.push(line);
  }

  return sections;
}

function assignPairs(section: Section): ValuePair[] | null {
  const queue = [...section.pairs];
  const assigned = section.operations.map((operation) => operation.pair ?? queue.shift());

  if (queue.length > 0 || assigned.some((pair) => pair === undefined)) {
    return null;
  }

  let balance = section.openingBalanceMinor;

  for (const pair of assigned as ValuePair[]) {
    balance += pair.signedMinor;

    if (balance !== pair.balanceMinor) {
      return null;
    }
  }

  return assigned as ValuePair[];
}

function partyOf(lines: string[]): string | undefined {
  for (const line of lines) {
    const named = namedPartyPattern.exec(line);

    if (named !== null) {
      return named[1].trim();
    }

    if (!detailPrefixes.some((prefix) => line.startsWith(prefix))) {
      return line.slice(0, 80);
    }
  }

  return undefined;
}

function rowOf(operation: PendingOperation, pair: ValuePair, currency: string): StatementRow {
  const purchaseDate = operation.lines
    .map((line) => purchaseDatePattern.exec(line)?.[1])
    .find((date) => date !== undefined);
  const [original] = operation.lines.flatMap((line) => {
    const match = originalAmountPattern.exec(line);

    return match === null ? [] : [match];
  });
  const originalAmountMinor = original === undefined ? null : parseStatementAmount(original[1]);
  const direction = pair.signedMinor < 0 ? 'expense' : 'income';
  const party = partyOf(operation.lines);
  const transactionType =
    inferTransactionType(operation.operation, direction) ??
    inferTransactionType(operation.lines.join(' '), direction);

  return {
    date: purchaseDate ?? operation.bookingDate,
    direction,
    amountMinor: Math.abs(pair.signedMinor),
    currency,
    ...(party === undefined ? {} : { party }),
    ...(transactionType === undefined ? {} : { transactionType }),
    ...(original === undefined || originalAmountMinor === null || original[2] === currency
      ? {}
      : { originalAmountMinor, originalCurrency: original[2] }),
  };
}

export function parseMillenniumPdfStatement(text: string): StatementParseResult {
  if (text.trim() === '') {
    return { ok: false, problem: 'empty' };
  }

  const sections = sectionsOf(normalizedLines(text));

  if (sections.length === 0) {
    return { ok: false, problem: 'unrecognized' };
  }

  const rows: StatementRow[] = [];

  for (const section of sections) {
    const pairs = assignPairs(section);

    if (pairs === null) {
      return { ok: false, problem: 'inconsistent' };
    }

    section.operations.forEach((operation, index) => {
      rows.push(rowOf(operation, pairs[index], section.currency));
    });
  }

  if (rows.length === 0) {
    return { ok: false, problem: 'noTransactions' };
  }

  return { ok: true, bank: 'millennium', rows, skippedCount: 0 };
}
