import type { IngestionTransactionType } from '@bankstats/ingestion-native';

import { detectStatementBank, type StatementBank } from './statement-bank';

export type StatementDirection = 'expense' | 'income';

export interface StatementRow {
  date: string;
  direction: StatementDirection;
  amountMinor: number;
  currency: string;
  party?: string;
  transactionType?: IngestionTransactionType;
  originalAmountMinor?: number;
  originalCurrency?: string;
}

export type StatementParseProblem =
  | 'empty'
  | 'unrecognized'
  | 'noTransactions'
  | 'inconsistent'
  | 'unsupportedBank'
  | 'unsupportedPdf';

export type StatementParseResult =
  | { ok: true; bank: StatementBank; rows: StatementRow[]; skippedCount: number }
  | { ok: false; problem: StatementParseProblem };

interface StatementColumns {
  date: number;
  amount?: number;
  debit?: number;
  credit?: number;
  currency?: number;
  party?: number;
  description?: number;
  type?: number;
  unnamed: number[];
}

const dateHeaders = [
  'data transakcji',
  'data operacji',
  'data ksiegowania',
  'data rozliczenia',
  'data waluty',
  'data',
];
const amountHeaders = ['kwota', 'kwota operacji', 'kwota transakcji', 'kwota w walucie rachunku'];
const debitHeaders = ['obciazenia', 'obciazenie', 'kwota obciazenia', 'wydatki'];
const creditHeaders = ['uznania', 'uznanie', 'kwota uznania', 'wplywy'];
const currencyHeaders = ['waluta', 'waluta rachunku', 'waluta operacji'];
const partyHeaders = [
  'odbiorca/zleceniodawca',
  'odbiorca / zleceniodawca',
  'nadawca/odbiorca',
  'nadawca / odbiorca',
  'kontrahent',
  'nazwa kontrahenta',
  'nazwa odbiorcy',
  'odbiorca',
  'zleceniodawca',
];
const descriptionHeaders = [
  'opis',
  'opis transakcji',
  'opis operacji',
  'tytul',
  'tytul operacji',
  'szczegoly',
];
const typeHeaders = ['rodzaj transakcji', 'typ transakcji', 'typ operacji', 'rodzaj operacji', 'rodzaj'];

const maximumPartyLength = 80;

export function normalizeHeader(value: string): string {
  return value
    .toLocaleLowerCase('pl')
    .replace(/ł/gu, 'l')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function detectDelimiter(text: string): string {
  const sample = text.split(/\r?\n/).slice(0, 30).join('\n');
  const candidates = [';', ',', '\t'];
  const counts = candidates.map((candidate) => sample.split(candidate).length - 1);
  const best = Math.max(...counts);

  return candidates[counts.indexOf(best)] ?? ';';
}

export function splitDelimited(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let isQuoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (isQuoted) {
      if (character === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') {
        isQuoted = false;
      } else {
        cell += character;
      }
    } else if (character === '"' && cell.trim() === '') {
      cell = '';
      isQuoted = true;
    } else if (character === delimiter) {
      row.push(cell.trim());
      cell = '';
    } else if (character === '\n' || character === '\r') {
      if (character === '\r' && text[index + 1] === '\n') {
        index += 1;
      }
      row.push(cell.trim());
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += character;
    }
  }

  if (cell !== '' || row.length > 0) {
    row.push(cell.trim());
    rows.push(row);
  }

  return rows.filter((candidate) => candidate.some((value) => value !== ''));
}

function columnOf(headers: string[], aliases: string[]): number | undefined {
  for (const alias of aliases) {
    const index = headers.indexOf(alias);

    if (index !== -1) {
      return index;
    }
  }

  return undefined;
}

function columnsOf(row: string[]): StatementColumns | null {
  const headers = row.map(normalizeHeader);
  const date = columnOf(headers, dateHeaders);
  const amount = columnOf(headers, amountHeaders);
  const debit = columnOf(headers, debitHeaders);
  const credit = columnOf(headers, creditHeaders);

  if (date === undefined || (amount === undefined && (debit === undefined || credit === undefined))) {
    return null;
  }

  return {
    date,
    amount,
    debit,
    credit,
    currency: columnOf(headers, currencyHeaders),
    party: columnOf(headers, partyHeaders),
    description: columnOf(headers, descriptionHeaders),
    type: columnOf(headers, typeHeaders),
    unnamed: headers.flatMap((header, index) => (header === '' ? [index] : [])),
  };
}

export function bankFromHeaders(headerRow: string[]): StatementBank | null {
  const headers = headerRow.map(normalizeHeader);

  if (headers.includes('numer rachunku/karty') && headers.includes('obciazenia')) {
    return 'millennium';
  }

  if (headers.includes('data waluty') && headers.includes('saldo po transakcji')) {
    return 'pko';
  }

  return null;
}

export function parseStatementAmount(value: string): number | null {
  const compact = value.replace(/[\s ]/g, '').replace(/^\+/, '');

  if (compact === '') {
    return null;
  }

  const isNegative = compact.startsWith('-');
  const unsigned = isNegative ? compact.slice(1) : compact;
  const lastComma = unsigned.lastIndexOf(',');
  const lastDot = unsigned.lastIndexOf('.');
  const decimalSeparator = lastComma > lastDot ? ',' : '.';
  const thousandsSeparator = decimalSeparator === ',' ? '.' : ',';
  const plain = unsigned.split(thousandsSeparator).join('').replace(decimalSeparator, '.');
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(plain);

  if (match === null) {
    return null;
  }

  const minor =
    Number.parseInt(match[1], 10) * 100 + Number.parseInt((match[2] ?? '').padEnd(2, '0'), 10);

  if (!Number.isSafeInteger(minor) || minor === 0) {
    return null;
  }

  return isNegative ? -minor : minor;
}

function isCalendarDate(year: number, month: number, day: number): boolean {
  const moment = new Date(Date.UTC(year, month - 1, day));

  return (
    moment.getUTCFullYear() === year && moment.getUTCMonth() === month - 1 && moment.getUTCDate() === day
  );
}

export function parseStatementDate(value: string): string | null {
  const datePart = value.trim().split(/[\sT]/)[0] ?? '';
  const yearFirst = /^(\d{4})[-./](\d{1,2})[-./](\d{1,2})$/.exec(datePart);
  const dayFirst = /^(\d{1,2})[-./](\d{1,2})[-./](\d{4})$/.exec(datePart);
  const parts = yearFirst
    ? [yearFirst[1], yearFirst[2], yearFirst[3]]
    : dayFirst
      ? [dayFirst[3], dayFirst[2], dayFirst[1]]
      : null;

  if (parts === null) {
    return null;
  }

  const [year, month, day] = parts.map((part) => Number.parseInt(part, 10));

  if (!isCalendarDate(year, month, day)) {
    return null;
  }

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function signedAmount(row: string[], columns: StatementColumns): number | null {
  if (columns.amount !== undefined) {
    return parseStatementAmount(row[columns.amount] ?? '');
  }

  const debit = parseStatementAmount(row[columns.debit ?? -1] ?? '');

  if (debit !== null) {
    return -Math.abs(debit);
  }

  const credit = parseStatementAmount(row[columns.credit ?? -1] ?? '');

  return credit === null ? null : Math.abs(credit);
}

export function inferTransactionType(
  label: string,
  direction: StatementDirection,
): IngestionTransactionType | undefined {
  const text = normalizeHeader(label);

  if (/\bblik\b/.test(text)) {
    return direction === 'expense' ? 'blikPayment' : 'incomingTransfer';
  }

  if (/bankomat|wyplata gotowki/.test(text)) {
    return direction === 'expense' ? 'atmWithdrawal' : undefined;
  }

  if (/odsetki|kapitalizacja/.test(text)) {
    return direction === 'income' ? 'interest' : 'fee';
  }

  if (/oplata|prowizja/.test(text)) {
    return direction === 'expense' ? 'fee' : 'refund';
  }

  if (/zwrot/.test(text) && direction === 'income') {
    return 'refund';
  }

  if (/\bkart[aey]?\b/.test(text)) {
    return direction === 'expense' ? 'cardPayment' : 'refund';
  }

  if (/przelew|zlecenie stale|polecenie zaplaty/.test(text)) {
    return direction === 'expense' ? 'outgoingTransfer' : 'incomingTransfer';
  }

  return undefined;
}

const detailPatterns = [
  /nazwa odbiorcy:\s*(.+)/i,
  /nazwa nadawcy:\s*(.+)/i,
  /adres:\s*(.+?)(?:\s+miasto:|\s+kraj:|$)/i,
];

function cleanParty(value: string): string | undefined {
  const cleaned = value.replace(/\s+/g, ' ').trim();

  return cleaned === '' ? undefined : cleaned.slice(0, maximumPartyLength);
}

function partyOf(row: string[], columns: StatementColumns, headerLength: number): string | undefined {
  const named = cleanParty(row[columns.party ?? -1] ?? '');

  if (named !== undefined) {
    return named;
  }

  const details = [
    row[columns.description ?? -1] ?? '',
    ...columns.unnamed.map((index) => row[index] ?? ''),
    ...row.slice(headerLength),
  ];

  for (const pattern of detailPatterns) {
    for (const detail of details) {
      const match = pattern.exec(detail);
      const found = match === null ? undefined : cleanParty(match[1]);

      if (found !== undefined) {
        return found;
      }
    }
  }

  return cleanParty(row[columns.description ?? -1] ?? '');
}

function rowOf(row: string[], columns: StatementColumns, headerLength: number): StatementRow | null {
  const date = parseStatementDate(row[columns.date] ?? '');
  const amount = signedAmount(row, columns);

  if (date === null || amount === null) {
    return null;
  }

  const direction: StatementDirection = amount < 0 ? 'expense' : 'income';
  const currency = (row[columns.currency ?? -1] ?? '').trim().toUpperCase();
  const party = partyOf(row, columns, headerLength);
  const transactionType =
    inferTransactionType(row[columns.type ?? -1] ?? '', direction) ??
    inferTransactionType(row[columns.description ?? -1] ?? '', direction);

  return {
    date,
    direction,
    amountMinor: Math.abs(amount),
    currency: /^[A-Z]{3}$/.test(currency) ? currency : 'PLN',
    ...(party === undefined ? {} : { party }),
    ...(transactionType === undefined ? {} : { transactionType }),
  };
}

export function parseStatement(text: string): StatementParseResult {
  if (text.trim() === '') {
    return { ok: false, problem: 'empty' };
  }

  const table = splitDelimited(text, detectDelimiter(text));
  const headerIndex = table.findIndex((row) => columnsOf(row) !== null);

  if (headerIndex === -1) {
    return { ok: false, problem: 'unrecognized' };
  }

  const headerRow = table[headerIndex];
  const columns = columnsOf(headerRow);

  if (columns === null) {
    return { ok: false, problem: 'unrecognized' };
  }

  const preamble = table
    .slice(0, headerIndex)
    .map((row) => row.join(' '))
    .join('\n');
  const bank = bankFromHeaders(headerRow) ?? detectStatementBank(preamble);

  if (bank === null) {
    return { ok: false, problem: 'unsupportedBank' };
  }

  const body = table.slice(headerIndex + 1);
  const rows = body.flatMap((row) => {
    const parsed = rowOf(row, columns, headerRow.length);

    return parsed === null ? [] : [parsed];
  });

  if (rows.length === 0) {
    return { ok: false, problem: 'noTransactions' };
  }

  return {
    ok: true,
    bank,
    rows,
    skippedCount: body.length - rows.length,
  };
}
