import type { IngestionRecord } from '@bankstats/ingestion-native';
import { describe, expect, test } from 'bun:test';

import { merchantSpendHistory, shownBucketKey } from './merchant-spend-history';

const endMs = new Date(2026, 8, 30, 12, 0).getTime();

function record(id: string, overrides: Partial<IngestionRecord> = {}): IngestionRecord {
  return {
    id,
    bank: 'millennium',
    direction: 'expense',
    transactionType: 'cardPayment',
    amountMinor: 1000,
    currency: 'PLN',
    merchant: 'Żabka',
    occurredAt: new Date(2026, 8, 20, 10, 0).toISOString(),
    capturedAt: new Date(2026, 8, 20, 10, 0).toISOString(),
    sourceApp: 'pl.millenniumbank.bankmillennium',
    status: 'posted',
    origin: 'capture',
    ...overrides,
  };
}

describe('merchantSpendHistory', () => {
  test('sums every counted payment at the same shop, including its other spellings', () => {
    const opened = record('opened');
    const history = merchantSpendHistory(
      opened,
      [
        opened,
        record('alias', { merchant: 'ZABKA NANO Z7423', amountMinor: 2000, occurredAt: new Date(2026, 8, 25).toISOString() }),
        record('other-shop', { merchant: 'Lidl', amountMinor: 9000 }),
        record('reversed', { status: 'reversed', amountMinor: 5000 }),
        record('income', { direction: 'income', transactionType: 'incomingTransfer', amountMinor: 7000 }),
      ],
      [],
      endMs,
      'month',
    );

    expect(history?.count).toBe(2);
    expect(history?.totalMinor).toBe(3000);
    expect(history?.buckets.reduce((sum, bucket) => sum + bucket.totalMinor, 0)).toBe(3000);
  });

  test('highlights the bucket that holds the opened transaction', () => {
    const opened = record('opened', { occurredAt: new Date(2026, 8, 25, 18, 30).toISOString() });
    const history = merchantSpendHistory(opened, [record('earlier'), opened], [], endMs, 'month');
    const highlighted = history?.buckets.find((bucket) => bucket.key === history.highlightedKey);

    expect(highlighted?.startMs).toBe(new Date(2026, 8, 25).getTime());
    expect(highlighted?.totalMinor).toBe(1000);
  });

  test('draws a bar for every day of the chosen range and counts only its payments', () => {
    const opened = record('opened', { occurredAt: new Date(2026, 8, 28, 10, 0).toISOString(), amountMinor: 1000 });
    const payments = [
      opened,
      record('this-month', { occurredAt: new Date(2026, 8, 10).toISOString(), amountMinor: 2000 }),
      record('this-quarter', { occurredAt: new Date(2026, 6, 15).toISOString(), amountMinor: 4000 }),
      record('years-ago', { occurredAt: new Date(2023, 0, 10).toISOString(), amountMinor: 8000 }),
    ];
    const week = merchantSpendHistory(opened, payments, [], endMs, 'week');
    const month = merchantSpendHistory(opened, payments, [], endMs, 'month');
    const quarter = merchantSpendHistory(opened, payments, [], endMs, 'quarter');

    expect(week?.buckets.length).toBe(8);
    expect(month?.buckets.length).toBe(31);
    expect(quarter?.buckets.length).toBe(91);
    expect((week?.buckets[1].startMs ?? 0) - (week?.buckets[0].startMs ?? 0)).toBe(86_400_000);
    expect([week?.totalMinor, month?.totalMinor, quarter?.totalMinor]).toEqual([1000, 3000, 7000]);
    expect([week?.count, month?.count, quarter?.count]).toEqual([1, 2, 3]);
    expect(quarter?.buckets.reduce((sum, bucket) => sum + bucket.totalMinor, 0)).toBe(7000);
  });

  test('does not highlight an opened payment older than the chosen range', () => {
    const opened = record('opened', { occurredAt: new Date(2026, 6, 15).toISOString() });
    const payments = [opened, record('recent', { occurredAt: new Date(2026, 8, 28).toISOString() })];

    expect(merchantSpendHistory(opened, payments, [], endMs, 'month')?.highlightedKey).toBeNull();
    expect(merchantSpendHistory(opened, payments, [], endMs, 'quarter')?.highlightedKey).not.toBeNull();
  });

  test('keeps the chart for a shop with no payments in the chosen range', () => {
    const opened = record('opened', { occurredAt: new Date(2026, 0, 15).toISOString() });
    const history = merchantSpendHistory(
      opened,
      [opened, record('older', { occurredAt: new Date(2025, 11, 1).toISOString() })],
      [],
      endMs,
      'week',
    );

    expect(history?.buckets.length).toBe(8);
    expect(history?.totalMinor).toBe(0);
    expect(history?.count).toBe(0);
    expect(history?.highlightedKey).toBeNull();
  });

  test('counts foreign payments only once they are converted to PLN', () => {
    const opened = record('opened');
    const history = merchantSpendHistory(
      opened,
      [
        opened,
        record('converted', { currency: 'EUR', amountMinor: 500, reportingAmountMinor: 2150 }),
        record('awaiting', { currency: 'EUR', amountMinor: 900 }),
      ],
      [],
      endMs,
      'month',
    );

    expect(history?.currency).toBe('PLN');
    expect(history?.totalMinor).toBe(3150);
  });

  test('does not highlight a bar for a payment the statistics leave out', () => {
    const reversed = record('reversed', { status: 'reversed', occurredAt: new Date(2026, 8, 25).toISOString() });
    const awaiting = record('awaiting', { currency: 'EUR', amountMinor: 900 });
    const counted = [record('first'), record('second', { occurredAt: new Date(2026, 8, 22).toISOString() })];

    expect(merchantSpendHistory(reversed, [reversed, ...counted], [], endMs, 'month')?.highlightedKey).toBeNull();
    expect(merchantSpendHistory(awaiting, [awaiting, ...counted], [], endMs, 'month')?.highlightedKey).toBeNull();
  });

  test('includes payments dated after the sheet opened and highlights their own bar', () => {
    const later = record('later', { occurredAt: new Date(2026, 9, 2, 9, 0).toISOString(), amountMinor: 4000 });
    const history = merchantSpendHistory(later, [record('earlier'), later], [], endMs, 'month');
    const highlighted = history?.buckets.find((bucket) => bucket.key === history.highlightedKey);

    expect(history?.totalMinor).toBe(5000);
    expect(highlighted?.startMs).toBe(new Date(2026, 9, 2).getTime());
    expect(highlighted?.totalMinor).toBe(4000);
  });

  test('stays hidden without a shop or with a single payment', () => {
    const transfer = record('transfer', { transactionType: 'outgoingTransfer', merchant: 'JAN KOWALSKI' });
    const income = record('income', { direction: 'income', transactionType: 'incomingTransfer' });
    const only = record('only');

    expect(merchantSpendHistory(transfer, [transfer, record('again', { transactionType: 'outgoingTransfer', merchant: 'JAN KOWALSKI' })], [], endMs, 'month')).toBeNull();
    expect(merchantSpendHistory(income, [income, record('income-2', { direction: 'income', transactionType: 'incomingTransfer' })], [], endMs, 'month')).toBeNull();
    expect(merchantSpendHistory(only, [only, record('other-shop', { merchant: 'Lidl' })], [], endMs, 'month')).toBeNull();
  });

  test('moves the highlight to the opened payment once it is converted, until a bar is chosen', () => {
    const opened = record('opened', {
      currency: 'EUR',
      amountMinor: 500,
      occurredAt: new Date(2026, 8, 25, 18, 30).toISOString(),
    });
    const counted = [
      record('first', { amountMinor: 9000 }),
      record('second', { occurredAt: new Date(2026, 8, 22).toISOString() }),
    ];
    const awaiting = merchantSpendHistory(opened, [opened, ...counted], [], endMs, 'month');
    const converted = merchantSpendHistory(opened, [{ ...opened, reportingAmountMinor: 2150 }, ...counted], [], endMs, 'month');

    if (awaiting === null || converted === null) {
      throw new Error('expected a history');
    }

    const openedDay = converted.buckets.find((bucket) => bucket.startMs === new Date(2026, 8, 25).getTime());
    const chosenDay = converted.buckets.find((bucket) => bucket.startMs === new Date(2026, 8, 22).getTime());

    expect(shownBucketKey(awaiting, null)).toBeNull();
    expect(shownBucketKey(converted, null)).toBe(openedDay?.key ?? 'missing');
    expect(shownBucketKey(converted, { key: chosenDay?.key ?? 'missing' })).toBe(chosenDay?.key ?? 'missing');
    expect(shownBucketKey(converted, { key: null })).toBeNull();
  });

  test('falls back to the opened payment when the chosen bar no longer exists', () => {
    const opened = record('opened', { occurredAt: new Date(2026, 8, 25, 18, 30).toISOString() });
    const history = merchantSpendHistory(opened, [record('earlier'), opened], [], endMs, 'month');

    if (history === null) {
      throw new Error('expected a history');
    }

    expect(shownBucketKey(history, { key: 'gone' })).toBe(history.highlightedKey);
  });
});
