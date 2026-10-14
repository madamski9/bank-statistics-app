import type { IngestionRecord } from '@bankstats/ingestion-native';
import { describe, expect, test } from 'bun:test';

import {
  compareMonths,
  expenseDaysOf,
  largestExpensesOf,
  monthKey,
  noSpendDaysOf,
  parseMonthKey,
  recordsForSummaryGroup,
  summarizeMonth,
  summaryMonths,
} from './monthly-summary';

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
    expect(summary.dailyCategories[0]?.dailyMinor[1]).toBe(21_000);
    expect(summary.busiestDay).toEqual({ day: 14, totalMinor: 30_000 });
    expect(summary.noSpendDays).toBe(12);
    expect(summary.transactionsPerDay).toBeCloseTo(4 / 15);
    expect(summary.dailyExpenseMinor).toBe(4_000);
    expect(summary.previousDailyExpenseMinor).toBe(10_000);
    expect(summary.dailyExpenseChange).toBeCloseTo(-0.6);
    expect(summary.merchants.map((group) => group.name)).toEqual(['Lidl', 'Żabka']);
  });

  test('keeps empty months in chronological order so a report opens its labelled month', () => {
    const records = [entry('Lidl', new Date(2026, 5, 3), 100), entry('Lidl', new Date(2026, 7, 3), 100)];

    expect(summaryMonths(records, now).map(monthKey)).toEqual(['2026-09', '2026-08', '2026-07', '2026-06']);
    expect(summaryMonths([], now).map(monthKey)).toEqual(['2026-09', '2026-08']);
    expect(summaryMonths([], now, { year: 2026, month: 5 }).map(monthKey)).toEqual([
      '2026-09', '2026-08', '2026-07', '2026-06',
    ]);
  });

  test('compares daily averages across calendar months including months with no spending', () => {
    const records = [entry('Lidl', new Date(2026, 5, 3), 3_000), entry('Lidl', new Date(2026, 7, 3), 6_200)];
    const comparison = compareMonths(records, { year: 2026, month: 8 }, now, 4);

    expect(comparison.map((entry) => monthKey(entry.month))).toEqual(['2026-06', '2026-07', '2026-08', '2026-09']);
    expect(comparison.map((entry) => entry.dailyAverageMinor)).toEqual([100, 0, 200, 0]);
  });

  test('limits a group detail to its store or category across comparison months', () => {
    const records = [
      entry('Lidl', new Date(2026, 8, 2), 2_000),
      entry('Żabka', new Date(2026, 8, 3), 3_000),
      entry('Lidl', new Date(2026, 7, 4), 4_000),
      { ...entry('Lidl', new Date(2026, 7, 5), 5_000), category: 'shopping' },
      entry('Lidl', new Date(2026, 2, 2), 6_000),
    ];
    const month = { year: 2026, month: 8 };
    const lidl = recordsForSummaryGroup(records, month, [], 'merchant', 'lidl');
    const groceries = recordsForSummaryGroup(records, month, [], 'category', 'groceries');

    expect(lidl.map((record) => record.amountMinor)).toEqual([2_000, 5_000, 4_000]);
    expect(groceries.map((record) => record.amountMinor)).toEqual([3_000, 2_000, 4_000]);
    expect(compareMonths(lidl, month, now, 2).map((entry) => entry.dailyAverageMinor)).toEqual([290, 133]);
  });

  test('reads back only real month keys', () => {
    expect(parseMonthKey('2026-09')).toEqual({ year: 2026, month: 8 });
    expect(parseMonthKey('2026-13')).toBeNull();
  });
});

describe('expenseDaysOf', () => {
  test('lists the month expenses day by day, from the costliest day down', () => {
    const records = [
      entry('Lidl', new Date(2026, 7, 3, 10), 3000),
      entry('Żabka', new Date(2026, 7, 3, 18), 1000),
      entry('Kino', new Date(2026, 7, 20, 20), 6000),
      entry('Apteka', new Date(2026, 7, 9, 9), 4000),
      entry('salary', new Date(2026, 7, 10), 500_000, 'income'),
      entry('July', new Date(2026, 6, 31), 9000),
    ];

    const days = expenseDaysOf(records, { year: 2026, month: 7 });

    expect(days.map((day) => [day.day, day.totalMinor, day.records.map((record) => record.id)])).toEqual([
      [20, 6000, ['Kino']],
      [3, 4000, ['Lidl', 'Żabka']],
      [9, 4000, ['Apteka']],
    ]);
  });
});

describe('largestExpensesOf', () => {
  test('lists the biggest expenses of the month, largest first', () => {
    const records = [
      entry('Lidl', new Date(2026, 7, 3), 3000),
      entry('Kino', new Date(2026, 7, 20), 6000),
      entry('Apteka', new Date(2026, 7, 9), 4000),
      entry('salary', new Date(2026, 7, 10), 500_000, 'income'),
    ];

    expect(largestExpensesOf(records, { year: 2026, month: 7 }, 2).map((record) => record.id)).toEqual([
      'Kino',
      'Apteka',
    ]);
  });
});

describe('noSpendDaysOf', () => {
  test('names the elapsed days without a single expense', () => {
    expect(noSpendDaysOf({ dailyExpensesMinor: [100, 0, 50, 0, 0], elapsedDays: 4 })).toEqual([2, 4]);
  });
});
