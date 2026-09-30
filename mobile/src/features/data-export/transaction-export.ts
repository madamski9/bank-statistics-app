import type { IngestionRecord } from '@bankstats/ingestion-native';

import { categoryLabel } from '@/features/classification/categories';
import {
  withGeneralAccounts,
  type FinancialAccount,
} from '@/features/financial-accounts/financial-account';
import { currentCopy } from '@/features/localization/language';

import { dataExportCopy } from './data-export-copy';

export type ExportFormat = 'csv' | 'json';

export interface ExportedTransaction {
  id: string;
  occurredAt: string;
  capturedAt: string;
  direction: 'expense' | 'income';
  amount: string;
  amountMinor: number;
  currency: string;
  merchant: string | null;
  category: string;
  account: string | null;
  bank: string;
  origin: 'capture' | 'manual';
  status: string;
  transactionType: string | null;
  needsReview: boolean;
  amountPln: string | null;
  exchangeRate: string | null;
  exchangeRateDate: string | null;
  eventId: string | null;
}

export interface TransactionExport {
  format: 'bankstats-transactions';
  version: 1;
  exportedAt: string;
  notes: string[];
  accounts: { id: string; name: string; bank: string; isGeneral: boolean }[];
  transactions: ExportedTransaction[];
}

const syntheticMerchant = 'SKLEP TEST';
const formulaTrigger = /^[=+\-@\t\r]/;

const csvColumns: (keyof ExportedTransaction)[] = [
  'occurredAt',
  'direction',
  'amount',
  'currency',
  'merchant',
  'category',
  'account',
  'bank',
  'origin',
  'status',
  'transactionType',
  'needsReview',
  'amountPln',
  'exchangeRate',
  'exchangeRateDate',
  'eventId',
  'capturedAt',
  'id',
];


function decimalAmount(minor: number): string {
  const units = Math.trunc(minor / 100);
  const fraction = Math.abs(minor % 100);

  return `${units}.${String(fraction).padStart(2, '0')}`;
}

function isExported(record: IngestionRecord): boolean {
  return record.origin === 'manual' || record.merchant !== syntheticMerchant;
}

export function exportedTransactions(
  records: IngestionRecord[],
  accounts: FinancialAccount[],
): ExportedTransaction[] {
  const accountNames = new Map(withGeneralAccounts(accounts).map((account) => [account.id, account.name]));

  return records
    .filter(isExported)
    .sort((left, right) => left.occurredAt.localeCompare(right.occurredAt))
    .map((record) => ({
      id: record.id,
      occurredAt: record.occurredAt,
      capturedAt: record.capturedAt,
      direction: record.direction,
      amount: decimalAmount(record.amountMinor),
      amountMinor: record.amountMinor,
      currency: record.currency,
      merchant: record.merchant ?? null,
      category: categoryLabel(record.category),
      account:
        (record.accountId === undefined ? undefined : accountNames.get(record.accountId)) ??
        record.accountName ??
        null,
      bank: record.bank,
      origin: record.origin === 'manual' ? 'manual' : 'capture',
      status: record.status,
      transactionType: record.transactionType ?? null,
      needsReview: record.review !== undefined,
      amountPln:
        record.currency === 'PLN'
          ? decimalAmount(record.amountMinor)
          : record.reportingAmountMinor === undefined
            ? null
            : decimalAmount(record.reportingAmountMinor),
      exchangeRate: record.exchangeRate ?? null,
      exchangeRateDate: record.exchangeRateDate ?? null,
      eventId: record.eventId ?? null,
    }));
}

export function buildTransactionExport(
  records: IngestionRecord[],
  accounts: FinancialAccount[],
  now: Date,
): TransactionExport {
  return {
    format: 'bankstats-transactions',
    version: 1,
    exportedAt: now.toISOString(),
    notes: currentCopy(dataExportCopy).notes,
    accounts: withGeneralAccounts(accounts).map(({ id, name, bank, isGeneral }) => ({
      id,
      name,
      bank,
      isGeneral,
    })),
    transactions: exportedTransactions(records, accounts),
  };
}

function csvCell(value: string | number | boolean | null): string {
  if (value === null) {
    return '';
  }

  const text = String(value);
  const safe = typeof value === 'string' && formulaTrigger.test(text) ? `'${text}` : text;

  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function transactionsCsv(transactions: ExportedTransaction[]): string {
  const header = csvColumns.join(',');
  const rows = transactions.map((transaction) =>
    csvColumns.map((column) => csvCell(transaction[column])).join(','),
  );

  return `﻿${[header, ...rows].join('\r\n')}\r\n`;
}

export function exportFileName(format: ExportFormat, now: Date): string {
  const day = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');

  return `bankstats-transakcje-${day}.${format}`;
}

export function exportContents(
  format: ExportFormat,
  records: IngestionRecord[],
  accounts: FinancialAccount[],
  now: Date,
): string {
  const data = buildTransactionExport(records, accounts, now);

  return format === 'csv' ? transactionsCsv(data.transactions) : JSON.stringify(data, null, 2);
}
