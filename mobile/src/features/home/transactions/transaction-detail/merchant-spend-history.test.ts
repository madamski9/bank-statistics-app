import type { IngestionRecord } from '@bankstats/ingestion-native';
import { describe, expect, test } from 'bun:test';

import { merchantSpendHistory } from './merchant-spend-history';

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
    );

    expect(history?.count).toBe(2);
    expect(history?.totalMinor).toBe(3000);
    expect(history?.buckets.reduce((sum, bucket) => sum + bucket.totalMinor, 0)).toBe(3000);
  });

  test('highlights the bucket that holds the opened transaction', () => {
    const opened = record('opened', { occurredAt: new Date(2026, 8, 25, 18, 30).toISOString() });
    const history = merchantSpendHistory(opened, [record('earlier'), opened], [], endMs);
    const highlighted = history?.buckets.find((bucket) => bucket.key === history.highlightedKey);

    expect(highlighted?.startMs).toBe(new Date(2026, 8, 25).getTime());
    expect(highlighted?.totalMinor).toBe(1000);
  });

  test('uses wider buckets for a long history so the bars stay readable', () => {
    const opened = record('opened');
    const short = merchantSpendHistory(opened, [opened, record('week-ago', { occurredAt: new Date(2026, 8, 13).toISOString() })], [], endMs);
    const long = merchantSpendHistory(
      opened,
      [opened, record('years-ago', { occurredAt: new Date(2023, 0, 10).toISOString() })],
      [],
      endMs,
    );

    expect(short?.buckets.length).toBeGreaterThanOrEqual(14);
    expect((short?.buckets[1].startMs ?? 0) - (short?.buckets[0].startMs ?? 0)).toBe(86_400_000);
    expect(long?.buckets[0].startMs).toBe(new Date(2023, 0, 1).getTime());
    expect(long?.buckets.length).toBeLessThan(60);
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
    );

    expect(history?.currency).toBe('PLN');
    expect(history?.totalMinor).toBe(3150);
  });

  test('stays hidden without a shop or with a single payment', () => {
    const transfer = record('transfer', { transactionType: 'outgoingTransfer', merchant: 'JAN KOWALSKI' });
    const income = record('income', { direction: 'income', transactionType: 'incomingTransfer' });
    const only = record('only');

    expect(merchantSpendHistory(transfer, [transfer, record('again', { transactionType: 'outgoingTransfer', merchant: 'JAN KOWALSKI' })], [], endMs)).toBeNull();
    expect(merchantSpendHistory(income, [income, record('income-2', { direction: 'income', transactionType: 'incomingTransfer' })], [], endMs)).toBeNull();
    expect(merchantSpendHistory(only, [only, record('other-shop', { merchant: 'Lidl' })], [], endMs)).toBeNull();
  });
});
