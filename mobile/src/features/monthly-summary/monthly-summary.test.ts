import type { IngestionRecord } from '@bankstats/ingestion-native';
import { describe, expect, test } from 'bun:test';

import { monthKey, parseMonthKey, summarizeMonth, summaryMonths } from './monthly-summary';

function entry(id: string, occurredAt: Date, amountMinor: number, direction: 'expense' | 'income' = 'expense'): IngestionRecord {
  return {
    id,
    bank: 'manual',
    direction,
    amountMinor,
    currency: 'PLN',
    merchant: id,
    category: direction === 'expense' ? 'groceries' : undefined,
    occurredAt: occurredAt.toISOString(),
    capturedAt: occurredAt.toISOString(),
    sourceApp: 'manual',
    status: 'posted',
    origin: 'manual',
  };
}

const now = new Date(2026, 8, 15);

describe('monthly summary', () => {
  test('sums a month and compares it with the one before', () => {
    const records = [
      entry('Lidl', new Date(2026, 7, 3), 30_000),
      entry('Żabka', new Date(2026, 7, 20), 10_000),
      entry('salary', new Date(2026, 7, 10), 500_000, 'income'),
      entry('Lidl', new Date(2026, 6, 3), 20_000),
    ];

    const summary = summarizeMonth(records, { year: 2026, month: 7 }, { rules: [], events: [], recurring: [], now });

    expect(summary).toMatchObject({
      isComplete: true,
      expenseMinor: 40_000,
      incomeMinor: 500_000,
      netMinor: 460_000,
      previousExpenseMinor: 20_000,
      expenseChange: 1,
    });
    expect(summary.largestExpense?.merchant).toBe('Lidl');
    expect(summary.categories[0]?.key).toBe('groceries');
  });

  test('spreads a month into days the way a screen time report does', () => {
    const records = [
      entry('Lidl', new Date(2026, 8, 2, 10), 20_000),
      entry('Żabka', new Date(2026, 8, 2, 18), 1_000),
      entry('Lidl', new Date(2026, 8, 9), 9_000),
      entry('Lidl', new Date(2026, 8, 14), 30_000),
      entry('rent', new Date(2026, 7, 5), 310_000),
    ];

    const summary = summarizeMonth(records, { year: 2026, month: 8 }, {
      rules: [],
      events: [],
      recurring: [],
      now: new Date(2026, 8, 15, 12),
    });

    expect(summary.dayCount).toBe(30);
    expect(summary.elapsedDays).toBe(15);
    expect(summary.dailyExpensesMinor).toHaveLength(30);
    expect(summary.dailyExpensesMinor[1]).toBe(21_000);
    expect(summary.dailyExpensesMinor[19]).toBe(0);
    expect(summary.busiestDay).toEqual({ day: 14, totalMinor: 30_000 });
    expect(summary.noSpendDays).toBe(12);
    expect(summary.transactionsPerDay).toBeCloseTo(4 / 15);
    expect(summary.dailyExpenseMinor).toBe(4_000);
    expect(summary.previousDailyExpenseMinor).toBe(10_000);
    expect(summary.dailyExpenseChange).toBeCloseTo(-0.6);
    expect(summary.merchants.map((group) => group.name)).toEqual(['Lidl', 'Żabka']);
  });

  test('lists every month with activity, newest first, starting with the current one', () => {
    const records = [entry('Lidl', new Date(2026, 5, 3), 100), entry('Lidl', new Date(2026, 7, 3), 100)];

    expect(summaryMonths(records, now).map(monthKey)).toEqual(['2026-09', '2026-08', '2026-06']);
  });

  test('reads back only real month keys', () => {
    expect(parseMonthKey('2026-09')).toEqual({ year: 2026, month: 8 });
    expect(parseMonthKey('2026-13')).toBeNull();
  });
});
