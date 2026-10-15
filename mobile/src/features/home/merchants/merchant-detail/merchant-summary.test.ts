import type { IngestionRecord } from '@bankstats/ingestion-native';
import { describe, expect, test } from 'bun:test';

import { bucketSizeFor, bucketSpending, chartWindow, earliestOccurredMs } from './merchant-summary';

function expense(occurredAt: string): IngestionRecord {
  return {
    id: occurredAt,
    bank: 'millennium',
    direction: 'expense',
    transactionType: 'cardPayment',
    amountMinor: 2500,
    currency: 'PLN',
    merchant: 'Jakdojade',
    occurredAt,
    capturedAt: occurredAt,
    sourceApp: 'pl.millenniumbank.bankmillennium',
    status: 'pending',
    origin: 'capture',
  };
}

function maxBuckets(records: IngestionRecord[], endMs: number) {
  const window = { startMs: null, endMs };
  const earliestMs = earliestOccurredMs(records);
  const size = bucketSizeFor('all', earliestMs, endMs);

  return bucketSpending(records, chartWindow(window, size, earliestMs), size);
}

describe('chartWindow', () => {
  const endMs = new Date(2026, 8, 29).getTime();

  test('shows at least two weeks on Max when the history is only a day old', () => {
    const buckets = maxBuckets([expense(new Date(2026, 8, 27, 13, 38).toISOString())], endMs);

    expect(buckets).toHaveLength(14);
    expect(buckets.filter((bucket) => bucket.totalMinor > 0)).toHaveLength(1);
  });

  test('keeps a longer history starting at its first transaction', () => {
    const buckets = maxBuckets([expense(new Date(2026, 7, 20, 9).toISOString())], endMs);

    expect(buckets).toHaveLength(40);
    expect(buckets[0].totalMinor).toBe(2500);
  });

  test('leaves a period with a fixed start untouched', () => {
    const window = { startMs: new Date(2026, 8, 22).getTime(), endMs };

    expect(chartWindow(window, 'day', new Date(2026, 8, 27).getTime())).toBe(window);
  });
});

describe('bucketSizeFor', () => {
  const endMs = new Date(2026, 8, 29).getTime();
  const daysAgo = (days: number) => endMs - days * 86_400_000;

  test('shows days up to three months and weeks across a year', () => {
    expect(bucketSizeFor('month')).toBe('day');
    expect(bucketSizeFor('quarter')).toBe('day');
    expect(bucketSizeFor('year')).toBe('week');
  });

  test('picks Max detail from how far back the history reaches', () => {
    expect(bucketSizeFor('all', daysAgo(80), endMs)).toBe('day');
    expect(bucketSizeFor('all', daysAgo(400), endMs)).toBe('week');
    expect(bucketSizeFor('all', daysAgo(1000), endMs)).toBe('month');
    expect(bucketSizeFor('all', null, endMs)).toBe('month');
  });
});
