import type { IngestionRecord } from '@bankstats/ingestion-native';

import {
  generalManualAccountId,
  withGeneralAccounts,
  type FinancialAccount,
} from '@/features/financial-accounts/financial-account';

import { statementBanks, type StatementBank } from './statement-bank';
import type { StatementRow } from './statement-parser';

export const statementImportSourceApp = 'statement-import';

export const matchingWindowDays = 3;

export type StatementMatch = 'notification' | 'added';

export interface ReconciledRow {
  key: string;
  row: StatementRow;
  match: StatementMatch | null;
}

export interface StatementReconciliation {
  rows: ReconciledRow[];
  firstDate: string;
  lastDate: string;
  capturedCount: number;
  addedCount: number;
  missingCount: number;
  coveragePercent: number;
}

const dayInMilliseconds = 86_400_000;

function localCalendarDate(timestamp: string): string | null {
  const moment = new Date(timestamp);

  if (Number.isNaN(moment.getTime())) {
    return null;
  }

  return [
    moment.getFullYear(),
    String(moment.getMonth() + 1).padStart(2, '0'),
    String(moment.getDate()).padStart(2, '0'),
  ].join('-');
}

function daysBetween(left: string, right: string): number {
  return Math.round(Math.abs(Date.parse(left) - Date.parse(right)) / dayInMilliseconds);
}

function amountsAgree(row: StatementRow, record: IngestionRecord): boolean {
  if (record.currency === row.currency) {
    return record.amountMinor === row.amountMinor;
  }

  if (record.currency === row.originalCurrency) {
    return record.amountMinor === row.originalAmountMinor;
  }

  return row.currency === 'PLN' && record.reportingAmountMinor === row.amountMinor;
}

function isStatementBank(value: string): value is StatementBank {
  return statementBanks.some((bank) => bank === value);
}

function belongsToOtherBank(record: IngestionRecord, bank: StatementBank): boolean {
  if (record.origin !== 'manual') {
    return isStatementBank(record.bank) && record.bank !== bank;
  }

  const accountBank = record.accountId?.startsWith('general-') ? record.accountId.slice('general-'.length) : null;

  return accountBank !== null && isStatementBank(accountBank) && accountBank !== bank;
}

function matchOf(record: IngestionRecord): StatementMatch {
  return record.origin === 'manual' ? 'added' : 'notification';
}

function hashOf(text: string, seed: number): string {
  let hash = seed >>> 0;

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return hash.toString(36).padStart(7, '0');
}

export function statementRowKeys(rows: StatementRow[], bank: StatementBank): string[] {
  const occurrences = new Map<string, number>();

  return rows.map((row) => {
    const signature = [
      bank,
      row.date,
      row.direction,
      row.amountMinor,
      row.currency,
      row.party ?? '',
    ].join('|');
    const occurrence = occurrences.get(signature) ?? 0;

    occurrences.set(signature, occurrence + 1);

    const text = `${signature}|${occurrence}`;

    return `statement-${hashOf(text, 0x811c9dc5)}${hashOf(text, 0x01234567)}`;
  });
}

export function reconcileStatement(
  rows: StatementRow[],
  bank: StatementBank,
  records: IngestionRecord[],
): StatementReconciliation {
  const keys = statementRowKeys(rows, bank);
  const candidates = records.flatMap((record) => {
    const date = localCalendarDate(record.occurredAt);

    return record.status === 'reversed' || date === null || belongsToOtherBank(record, bank)
      ? []
      : [{ record, date }];
  });
  const used = new Set<string>();
  const order = rows.map((_, index) => index).sort((left, right) => rows[left].date.localeCompare(rows[right].date));
  const matches = new Array<StatementMatch | null>(rows.length).fill(null);

  for (const index of order) {
    const row = rows[index];
    const best = candidates
      .filter(
        ({ record, date }) =>
          !used.has(record.id) &&
          record.direction === row.direction &&
          amountsAgree(row, record) &&
          daysBetween(date, row.date) <= matchingWindowDays,
      )
      .sort((left, right) => {
        const distance = daysBetween(left.date, row.date) - daysBetween(right.date, row.date);

        if (distance !== 0) {
          return distance;
        }

        return Number(left.record.origin === 'manual') - Number(right.record.origin === 'manual');
      })[0];

    if (best !== undefined) {
      used.add(best.record.id);
      matches[index] = matchOf(best.record);
    }
  }

  const reconciled = rows.map((row, index) => ({ key: keys[index], row, match: matches[index] }));
  const capturedCount = matches.filter((match) => match === 'notification').length;
  const addedCount = matches.filter((match) => match === 'added').length;
  const dates = rows.map((row) => row.date).sort();

  return {
    rows: reconciled,
    firstDate: dates[0] ?? '',
    lastDate: dates[dates.length - 1] ?? '',
    capturedCount,
    addedCount,
    missingCount: rows.length - capturedCount - addedCount,
    coveragePercent: rows.length === 0 ? 0 : Math.round((capturedCount / rows.length) * 100),
  };
}

function accountFor(bank: StatementBank, accounts: FinancialAccount[]): FinancialAccount | undefined {
  const all = withGeneralAccounts(accounts);
  return all.find((account) => account.id === `general-${bank}`);
}

function occurrenceOf(date: string): string {
  const [year, month, day] = date.split('-').map((part) => Number.parseInt(part, 10));

  return new Date(year, month - 1, day, 12, 0, 0, 0).toISOString();
}

export function recordsFromStatement(
  rows: ReconciledRow[],
  bank: StatementBank,
  accounts: FinancialAccount[],
  now: Date,
): IngestionRecord[] {
  const account = accountFor(bank, accounts);

  return rows.map(({ key, row }) => ({
    id: key,
    bank: 'manual',
    direction: row.direction,
    ...(row.transactionType === undefined ? {} : { transactionType: row.transactionType }),
    amountMinor: row.amountMinor,
    currency: row.currency,
    ...(row.party === undefined ? {} : { merchant: row.party }),
    accountId: account?.id ?? generalManualAccountId,
    ...(account === undefined ? {} : { accountName: account.name }),
    occurredAt: occurrenceOf(row.date),
    capturedAt: now.toISOString(),
    sourceApp: statementImportSourceApp,
    status: 'posted',
    origin: 'manual',
  }));
}
