import type { IngestionRecord } from '@bankstats/ingestion-native';
import { describe, expect, test } from 'bun:test';

import {
  buildTransactionExport,
  exportContents,
  exportFileName,
  exportedTransactions,
  transactionsCsv,
} from './transaction-export';

const now = new Date(2026, 8, 25, 9, 30);

function record(overrides: Partial<IngestionRecord> = {}): IngestionRecord {
  return {
    id: 'capture-1',
    bank: 'millennium',
    direction: 'expense',
    transactionType: 'cardPayment',
    amountMinor: 1234,
    currency: 'PLN',
    merchant: 'Lidl',
    occurredAt: '2026-09-20T10:00:00.000Z',
    capturedAt: '2026-09-20T10:00:05.000Z',
    sourceApp: 'pl.millenniumbank.bankmillennium',
    status: 'posted',
    origin: 'capture',
    ...overrides,
  };
}

describe('exportedTransactions', () => {
  test('exports a user-assigned bank name without the private notification title', () => {
    const [exported] = exportedTransactions([record({ bank: 'unknown', bankName: 'Trade Republic', notificationTitle: 'Tytuł z Wallet' })], []);
    expect(exported.bank).toBe('Trade Republic');
    expect(exported).not.toHaveProperty('notificationTitle');
  });
  test('describes each transaction with its account, category and review state', () => {
    const [exported] = exportedTransactions(
      [
        record({
          origin: 'manual',
          bank: 'manual',
          accountId: 'account-savings',
          category: 'groceries',
          review: 'merchant',
        }),
      ],
      [{ id: 'account-savings', bank: 'manual', name: 'Oszczędności', isGeneral: false }],
    );

    expect(exported).toMatchObject({
      amount: '12.34',
      amountMinor: 1234,
      account: 'Oszczędności',
      origin: 'manual',
      needsReview: true,
    });
    expect(exported.category).not.toBe('groceries');
  });

  test('uses the general account name and leaves out the synthetic test capture', () => {
    const exported = exportedTransactions(
      [
        record({ accountId: 'general-millennium' }),
        record({ id: 'synthetic', merchant: 'SKLEP TEST' }),
      ],
      [],
    );

    expect(exported.map((transaction) => transaction.id)).toEqual(['capture-1']);
    expect(exported[0].account).toBe('Millennium');
  });

  test('orders transactions from the oldest', () => {
    const exported = exportedTransactions(
      [
        record({ id: 'late', occurredAt: '2026-09-21T10:00:00.000Z' }),
        record({ id: 'early', occurredAt: '2026-09-01T10:00:00.000Z' }),
      ],
      [],
    );

    expect(exported.map((transaction) => transaction.id)).toEqual(['early', 'late']);
  });

  test('carries no raw notification text or source application', () => {
    const json = exportContents('json', [record()], [], now);

    expect(json).not.toContain('sourceApp');
    expect(json).not.toContain('pl.millenniumbank');
    expect(JSON.parse(json)).toMatchObject({ format: 'bankstats-transactions', version: 1 });
  });
});

describe('transactionsCsv', () => {
  test('writes a header and one row per transaction', () => {
    const csv = transactionsCsv(exportedTransactions([record()], []));
    const lines = csv.replace('﻿', '').trim().split('\r\n');

    expect(lines[0]?.startsWith('occurredAt,direction,amount,currency,merchant')).toBe(true);
    expect(lines[1]).toContain('2026-09-20T10:00:00.000Z,expense,12.34,PLN,Lidl');
    expect(lines).toHaveLength(2);
  });

  test('quotes commas, quotes and line breaks', () => {
    const csv = transactionsCsv(
      exportedTransactions([record({ merchant: 'Sklep "Pod Lipą", Kraków' })], []),
    );

    expect(csv).toContain('"Sklep ""Pod Lipą"", Kraków"');
  });

  test('neutralises text a spreadsheet would run as a formula', () => {
    const csv = transactionsCsv(
      exportedTransactions([record({ merchant: '=HYPERLINK("http://x","klik")' })], []),
    );

    expect(csv).toContain(`"'=HYPERLINK(""http://x"",""klik"")"`);
  });
});

describe('export file', () => {
  test('names the file after the day it was made', () => {
    expect(exportFileName('csv', now)).toBe('bankstats-transakcje-2026-09-25.csv');
    expect(exportFileName('json', now)).toBe('bankstats-transakcje-2026-09-25.json');
  });

  test('lists the accounts so the transactions can be interpreted', () => {
    const data = buildTransactionExport([], [], now);

    expect(data.accounts.map((account) => account.id)).toEqual([
      'general-manual',
      'general-millennium',
      'general-pko',
      'general-erste',
      'general-ing',
      'general-mbank',
    ]);
    expect(data.notes.length).toBeGreaterThan(0);
  });
});
