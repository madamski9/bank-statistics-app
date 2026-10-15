import type { IngestionRecord } from '@bankstats/ingestion-native';
import { describe, expect, test } from 'bun:test';

import { periodWindow } from '../period/periods';
import { spendingTrend } from './spending-trend';

const reference = new Date(2026, 8, 25, 12, 0);

function record(day: number, overrides: Partial<IngestionRecord> = {}): IngestionRecord {
  const occurredAt = new Date(2026, 8, day, 10, 0).toISOString();

  return {
    id: `record-${day}-${Math.random()}`,
    bank: 'millennium',
    direction: 'expense',
    transactionType: 'cardPayment',
    amountMinor: 1000,
    currency: 'PLN',
    merchant: 'Żabka',
    occurredAt,
    capturedAt: occurredAt,
    sourceApp: 'pl.millenniumbank.bankmillennium',
    status: 'pending',
    origin: 'capture',
    ...overrides,
  };
}

describe('spending trend', () => {
  test('lines expenses and income up on the same days', () => {
    const trend = spendingTrend(
      [
        record(20, { amountMinor: 2500 }),
        record(24, { amountMinor: 900000, direction: 'income' }),
        record(24, { amountMinor: 700, currency: 'EUR' }),
      ],
      'PLN',
      periodWindow('week', reference),
      'week',
    );

    expect(trend.points).toHaveLength(8);
    expect(trend.expense).toHaveLength(8);
    expect(trend.income).toHaveLength(8);
    expect(trend.expense.reduce((sum, value) => sum + value, 0)).toBe(2500);
    expect(trend.income.reduce((sum, value) => sum + value, 0)).toBe(900000);
    expect(trend.expense.indexOf(2500)).toBe(2);
    expect(trend.income.indexOf(900000)).toBe(6);
  });

  test('fills the missing direction with zeros', () => {
    const trend = spendingTrend([record(24)], 'PLN', periodWindow('week', reference), 'week');

    expect(trend.income).toEqual(trend.points.map(() => 0));
  });

  test('starts all-time trends at the earliest record of either direction', () => {
    const trend = spendingTrend(
      [record(10, { direction: 'income' }), record(20)],
      'PLN',
      periodWindow('all', reference),
      'all',
    );

    expect(trend.points).toHaveLength(16);
    expect(trend.income[0]).toBe(1000);
    expect(trend.expense[10]).toBe(1000);
  });

  test('is empty without records in the currency', () => {
    expect(spendingTrend([], 'PLN', periodWindow('month', reference), 'month').points).toEqual([]);
  });
});
