import type { IngestionRecord } from '@bankstats/ingestion-native';
import { describe, expect, test } from 'bun:test';

import type { StatementRow } from './statement-parser';
import {
  reconcileStatement,
  recordsFromStatement,
  statementImportSourceApp,
  statementRowKeys,
} from './statement-reconciliation';

function captured(overrides: Partial<IngestionRecord>): IngestionRecord {
  return {
    id: 'captured-1',
    bank: 'millennium',
    direction: 'expense',
    transactionType: 'cardPayment',
    amountMinor: 2508,
    currency: 'PLN',
    merchant: 'Lidl',
    occurredAt: '2026-09-21T12:00:00.000Z',
    capturedAt: '2026-09-21T12:00:00.000Z',
    sourceApp: 'pl.millenniumbank.bankmillennium',
    status: 'posted',
    origin: 'capture',
    ...overrides,
  };
}

const lidl: StatementRow = {
  date: '2026-09-22',
  direction: 'expense',
  amountMinor: 2508,
  currency: 'PLN',
  party: 'LIDL GDANSK PL',
  transactionType: 'cardPayment',
};

const salary: StatementRow = {
  date: '2026-09-10',
  direction: 'income',
  amountMinor: 350_000,
  currency: 'PLN',
  party: 'FIRMA',
  transactionType: 'incomingTransfer',
};

describe('reconcileStatement', () => {
  test('matches a captured transaction booked a day later and reports coverage', () => {
    const result = reconcileStatement([lidl, salary], 'millennium', [captured({})]);

    expect(result.rows.map((row) => row.match)).toEqual(['notification', null]);
    expect(result).toMatchObject({
      capturedCount: 1,
      addedCount: 0,
      missingCount: 1,
      coveragePercent: 50,
      firstDate: '2026-09-10',
      lastDate: '2026-09-22',
    });
  });

  test('does not match across direction, amount, reversal or a distant date', () => {
    const records = [
      captured({ id: 'income', direction: 'income' }),
      captured({ id: 'amount', amountMinor: 2509 }),
      captured({ id: 'reversed', status: 'reversed' }),
      captured({ id: 'late', occurredAt: '2026-09-30T12:00:00.000Z' }),
    ];

    expect(reconcileStatement([lidl], 'millennium', records).missingCount).toBe(1);
  });

  test('uses each recorded transaction for one statement row only', () => {
    const result = reconcileStatement([lidl, { ...lidl, date: '2026-09-21' }], 'millennium', [
      captured({}),
    ]);

    expect(result.capturedCount).toBe(1);
    expect(result.missingCount).toBe(1);
  });

  test('matches a foreign capture by its PLN reporting amount', () => {
    const foreign = captured({ amountMinor: 600, currency: 'EUR', reportingAmountMinor: 2508 });

    expect(reconcileStatement([lidl], 'millennium', [foreign]).capturedCount).toBe(1);
  });

  test('matches a foreign capture by the card amount printed on the statement', () => {
    const foreign = captured({ amountMinor: 2214, currency: 'EUR', reportingAmountMinor: 9500 });
    const row = { ...lidl, amountMinor: 9614, originalAmountMinor: 2214, originalCurrency: 'EUR' };

    expect(reconcileStatement([row], 'millennium', [foreign]).capturedCount).toBe(1);
  });

  test('recognises rows already added from an earlier import', () => {
    const [imported] = recordsFromStatement(
      reconcileStatement([lidl], 'millennium', []).rows,
      'millennium',
      [],
      new Date('2026-10-01T10:00:00.000Z'),
    );
    const result = reconcileStatement([lidl], 'millennium', [imported]);

    expect(result.rows[0].match).toBe('added');
    expect(result.coveragePercent).toBe(0);
  });
});

describe('statementRowKeys', () => {
  test('is stable across imports and distinguishes identical rows', () => {
    const first = statementRowKeys([lidl, lidl], 'millennium');

    expect(statementRowKeys([lidl, lidl], 'millennium')).toEqual(first);
    expect(first[0]).not.toBe(first[1]);
    expect(first[0]).toStartWith('statement-');
  });
});

describe('recordsFromStatement', () => {
  test('creates manual transactions in the bank general account', () => {
    const rows = reconcileStatement([salary], 'pko', []).rows;
    const [record] = recordsFromStatement(rows, 'pko', [], new Date('2026-10-01T10:00:00.000Z'));
    const occurred = new Date(record.occurredAt);

    expect(record).toMatchObject({
      id: rows[0].key,
      bank: 'manual',
      direction: 'income',
      transactionType: 'incomingTransfer',
      amountMinor: 350_000,
      currency: 'PLN',
      merchant: 'FIRMA',
      accountId: 'general-pko',
      accountName: 'PKO BP',
      capturedAt: '2026-10-01T10:00:00.000Z',
      sourceApp: statementImportSourceApp,
      status: 'posted',
      origin: 'manual',
    });
    expect([occurred.getFullYear(), occurred.getMonth(), occurred.getDate()]).toEqual([2026, 8, 10]);
  });

  test('uses the general Erste account for an Erste statement', () => {
    const rows = reconcileStatement([salary], 'erste', []).rows;
    const [record] = recordsFromStatement(rows, 'erste', [], new Date());

    expect(record.bank).toBe('manual');
    expect(record.accountId).toBe('general-erste');
  });
});
