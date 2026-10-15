import type { IngestionRecord } from '@bankstats/ingestion-native';
import { describe, expect, test } from 'bun:test';

import {
  detectRecurringPayments,
  hasPriceIncrease,
  monthlyRecurringCost,
  recurringCandidates,
  upcomingFirst,
} from './recurring-payments';

let sequence = 0;

function charge(merchant: string, occurredAt: string, amountMinor: number): IngestionRecord {
  sequence += 1;

  return {
    id: `charge-${sequence}`,
    bank: 'millennium',
    direction: 'expense',
    transactionType: 'cardPayment',
    amountMinor,
    currency: 'PLN',
    merchant,
    occurredAt,
    capturedAt: occurredAt,
    sourceApp: 'app',
    status: 'posted',
    origin: 'capture',
  };
}

const now = new Date('2026-09-20T12:00:00Z');

describe('recurring payments', () => {
  test('finds a monthly subscription and expects the next charge a month later', () => {
    const records = [
      charge('Spotify', '2026-06-05T08:00:00Z', 2399),
      charge('Spotify', '2026-07-05T08:00:00Z', 2399),
      charge('Spotify', '2026-08-05T08:00:00Z', 2399),
      charge('Spotify', '2026-09-05T08:00:00Z', 2399),
    ];

    const [payment] = detectRecurringPayments(records, [], now);

    expect(payment).toMatchObject({ name: 'Spotify', cadence: 'monthly', isActive: true, lastAmountMinor: 2399 });
    expect(payment?.nextExpectedAt.slice(0, 10)).toBe('2026-10-05');
    expect(monthlyRecurringCost([payment!])).toBe(2399);
  });

  test('trusts two monthly charges of a known subscription service', () => {
    const records = [
      charge('Netflix', '2026-08-10T08:00:00Z', 4900),
      charge('Netflix', '2026-09-10T08:00:00Z', 4900),
    ];

    expect(detectRecurringPayments(records, [], now).map((payment) => payment.name)).toEqual(['Netflix']);
  });

  test('ignores a shop visited often with varying baskets', () => {
    const records = [
      charge('Biedronka', '2026-09-01T08:00:00Z', 4520),
      charge('Biedronka', '2026-09-03T08:00:00Z', 12999),
      charge('Biedronka', '2026-09-06T08:00:00Z', 870),
      charge('Biedronka', '2026-09-10T08:00:00Z', 23410),
      charge('Biedronka', '2026-09-14T08:00:00Z', 5600),
    ];

    expect(detectRecurringPayments(records, [], now)).toEqual([]);
  });

  test('notices a price increase', () => {
    const records = [
      charge('Netflix', '2026-06-10T08:00:00Z', 4900),
      charge('Netflix', '2026-07-10T08:00:00Z', 4900),
      charge('Netflix', '2026-08-10T08:00:00Z', 4900),
      charge('Netflix', '2026-09-10T08:00:00Z', 5500),
    ];

    const [payment] = detectRecurringPayments(records, [], now);

    expect(payment?.priceChangeMinor).toBe(600);
    expect(hasPriceIncrease(payment!)).toBe(true);
  });

  test('marks a payment that stopped arriving as no longer active', () => {
    const records = [
      charge('Siłownia', '2026-02-01T08:00:00Z', 12900),
      charge('Siłownia', '2026-03-01T08:00:00Z', 12900),
      charge('Siłownia', '2026-04-01T08:00:00Z', 12900),
    ];

    expect(detectRecurringPayments(records, [], now)[0]?.isActive).toBe(false);
  });

  test('leaves out a payment the user said is not recurring', () => {
    const records = [
      charge('Spotify', '2026-07-05T08:00:00Z', 2399),
      charge('Spotify', '2026-08-05T08:00:00Z', 2399),
      charge('Spotify', '2026-09-05T08:00:00Z', 2399),
    ];
    const [payment] = detectRecurringPayments(records, [], now);

    expect(detectRecurringPayments(records, [], now, new Set([payment!.key]))).toEqual([]);
  });

  test('tracks a payment the user added after a single charge', () => {
    const records = [charge('Anthropic', '2026-09-12T08:00:00Z', 9000)];
    const [candidate] = recurringCandidates(records, [], now, new Set());

    expect(detectRecurringPayments(records, [], now)).toEqual([]);

    const [payment] = detectRecurringPayments(records, [], now, new Set(), [
      { key: candidate!.key, name: candidate!.name, cadence: 'monthly' },
    ]);

    expect(payment).toMatchObject({ name: 'Anthropic', isTracked: true, isActive: true, lastAmountMinor: 9000 });
    expect(payment?.nextExpectedAt.slice(0, 10)).toBe('2026-10-12');
  });

  test('rolls a tracked payment forward to its next upcoming charge', () => {
    const records = [charge('Anthropic', '2026-06-12T08:00:00Z', 9000)];
    const [candidate] = recurringCandidates(records, [], now, new Set());
    const [payment] = detectRecurringPayments(records, [], now, new Set(), [
      { key: candidate!.key, name: candidate!.name, cadence: 'monthly' },
    ]);

    expect(payment?.nextExpectedAt.slice(0, 10)).toBe('2026-10-12');
    expect(payment?.isActive).toBe(true);
  });

  test('keeps a tracked payment even after it was hidden before', () => {
    const records = [charge('Anthropic', '2026-09-12T08:00:00Z', 9000)];
    const [candidate] = recurringCandidates(records, [], now, new Set());
    const payments = detectRecurringPayments(records, [], now, new Set([candidate!.key]), [
      { key: candidate!.key, name: candidate!.name, cadence: 'yearly' },
    ]);

    expect(payments.map((payment) => payment.cadence)).toEqual(['yearly']);
  });

  test('offers the most recent payees as candidates, without the excluded ones', () => {
    const records = [
      charge('Żabka', '2026-09-01T08:00:00Z', 1200),
      charge('Anthropic', '2026-09-12T08:00:00Z', 9000),
      charge('Spotify', '2026-09-05T08:00:00Z', 2399),
    ];
    const all = recurringCandidates(records, [], now, new Set());
    const spotify = all.find((candidate) => candidate.name === 'Spotify');

    expect(all.map((candidate) => candidate.name)).toEqual(['Anthropic', 'Spotify', 'Żabka']);
    expect(
      recurringCandidates(records, [], now, new Set([spotify!.key])).map((candidate) => candidate.name),
    ).toEqual(['Anthropic', 'Żabka']);
  });

  test('orders payments by the closest upcoming charge', () => {
    const records = [
      charge('Netflix', '2026-08-25T08:00:00Z', 4900),
      charge('Netflix', '2026-09-25T08:00:00Z', 4900),
      charge('Spotify', '2026-07-05T08:00:00Z', 2399),
      charge('Spotify', '2026-08-05T08:00:00Z', 2399),
      charge('Spotify', '2026-09-05T08:00:00Z', 2399),
    ];
    const ordered = upcomingFirst(detectRecurringPayments(records, [], new Date('2026-09-26T12:00:00Z')));

    expect(ordered.map((payment) => payment.name)).toEqual(['Spotify', 'Netflix']);
  });
});
