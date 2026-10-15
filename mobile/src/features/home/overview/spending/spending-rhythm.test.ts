import type { IngestionRecord } from '@bankstats/ingestion-native';
import { describe, expect, test } from 'bun:test';

import { periodWindow } from '../period/periods';

import { expenseRhythm, rhythmAverageMinor, rhythmPeak } from './spending-rhythm';

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

describe('expense rhythm', () => {
  test('buckets only expenses in the summary currency, one bar per day of the week', () => {
    const { buckets } = expenseRhythm(
      [
        record(20, { amountMinor: 2500 }),
        record(20, { amountMinor: 500 }),
        record(23, { amountMinor: 9000, direction: 'income' }),
        record(24, { amountMinor: 7000, currency: 'EUR' }),
        record(24, { amountMinor: 1200 }),
      ],
      'PLN',
      periodWindow('week', reference),
      'week',
    );

    expect(buckets).toHaveLength(8);
    expect(buckets.reduce((sum, bucket) => sum + bucket.totalMinor, 0)).toBe(4200);
    expect(rhythmPeak(buckets)?.totalMinor).toBe(3000);
  });

  test('averages over every bar, including the empty ones', () => {
    const { buckets } = expenseRhythm([record(24, { amountMinor: 8000 })], 'PLN', periodWindow('week', reference), 'week');

    expect(rhythmAverageMinor(buckets)).toBe(1000);
  });

  test('splits a short all-time history into days instead of one month', () => {
    const rhythm = expenseRhythm([record(10), record(24)], 'PLN', periodWindow('all', reference), 'all');

    expect(rhythm.size).toBe('day');
    expect(rhythm.buckets.length).toBeGreaterThan(10);
  });

  test('has no peak and a zero average without spending', () => {
    expect(rhythmAverageMinor([])).toBe(0);
    expect(rhythmPeak([])).toBeNull();
  });
});
