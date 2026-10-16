import type { IngestionRecord } from '@bankstats/ingestion-native';
import { describe, expect, test } from 'bun:test';

import {
  detectRecurringPayments,
  hasPriceIncrease,
  monthlyRecurringCost,
  recurringCandidates,
  trackedPaymentKey,
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
    const [candidate] = recurringCandidates(records, [], now, []);

    expect(detectRecurringPayments(records, [], now)).toEqual([]);

    const [payment] = detectRecurringPayments(records, [], now, new Set(), [
      { key: candidate!.key, name: candidate!.name, cadence: 'monthly' },
    ]);

    expect(payment).toMatchObject({ name: 'Anthropic', isTracked: true, isActive: true, lastAmountMinor: 9000 });
    expect(payment?.nextExpectedAt.slice(0, 10)).toBe('2026-10-12');
  });

  test('rolls a tracked payment forward to its next upcoming charge', () => {
    const records = [charge('Anthropic', '2026-06-12T08:00:00Z', 9000)];
    const [candidate] = recurringCandidates(records, [], now, []);
    const [payment] = detectRecurringPayments(records, [], now, new Set(), [
      { key: candidate!.key, name: candidate!.name, cadence: 'monthly' },
    ]);

    expect(payment?.nextExpectedAt.slice(0, 10)).toBe('2026-10-12');
    expect(payment?.isActive).toBe(true);
  });

  test('keeps a tracked payment even after it was hidden before', () => {
    const records = [charge('Anthropic', '2026-09-12T08:00:00Z', 9000)];
    const [candidate] = recurringCandidates(records, [], now, []);
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
    const all = recurringCandidates(records, [], now, []);
    const spotify = all.find((candidate) => candidate.name === 'Spotify');
    const tracked = detectRecurringPayments(records, [], now, new Set(), [
      { key: spotify!.key, name: spotify!.name, cadence: 'monthly' },
    ]);

    expect(all.map((candidate) => candidate.name)).toEqual(['Anthropic', 'Spotify', 'Żabka']);
    expect(recurringCandidates(records, [], now, tracked).map((candidate) => candidate.name)).toEqual([
      'Anthropic',
      'Żabka',
    ]);
  });

  test('offers each distinct payment at one shop separately', () => {
    const records = [
      charge('Apple', '2026-03-14T08:00:00Z', 42000),
      charge('Apple', '2026-08-03T08:00:00Z', 1499),
      charge('Apple', '2026-09-03T08:00:00Z', 1499),
    ];
    const [apple] = recurringCandidates(records, [], now, []);

    expect(apple?.payments.map((payment) => payment.amountMinor)).toEqual([1499, 42000]);
    expect(apple?.payments.map((payment) => payment.chargeCount)).toEqual([2, 1]);
  });

  test('keeps the other payment at a shop available after tracking one of them', () => {
    const records = [
      charge('Apple', '2026-03-14T08:00:00Z', 42000),
      charge('Apple', '2026-08-03T08:00:00Z', 1499),
      charge('Apple', '2026-09-03T08:00:00Z', 1499),
    ];
    const [apple] = recurringCandidates(records, [], now, []);
    const monthly = {
      key: trackedPaymentKey(apple!.key, 1499),
      partyKey: apple!.key,
      name: apple!.name,
      cadence: 'monthly' as const,
      amountMinor: 1499,
    };
    const afterMonthly = detectRecurringPayments(records, [], now, new Set(), [monthly]);
    const [remaining] = recurringCandidates(records, [], now, afterMonthly);

    expect(remaining?.payments.map((payment) => payment.amountMinor)).toEqual([42000]);

    const yearly = {
      key: trackedPaymentKey(apple!.key, 42000),
      partyKey: apple!.key,
      name: apple!.name,
      cadence: 'yearly' as const,
      amountMinor: 42000,
    };
    const both = detectRecurringPayments(records, [], now, new Set(), [monthly, yearly]);

    expect(both.map((payment) => [payment.cadence, payment.lastAmountMinor])).toEqual([
      ['yearly', 42000],
      ['monthly', 1499],
    ]);
    expect(recurringCandidates(records, [], now, both)).toEqual([]);
  });

  test('reads a payment tracked before amounts were remembered as the most frequent one', () => {
    const records = [
      charge('Apple', '2026-03-14T08:00:00Z', 42000),
      charge('Apple', '2026-08-03T08:00:00Z', 1499),
      charge('Apple', '2026-09-03T08:00:00Z', 1499),
    ];
    const [apple] = recurringCandidates(records, [], now, []);
    const payments = detectRecurringPayments(records, [], now, new Set(), [
      { key: apple!.key, name: apple!.name, cadence: 'monthly' },
    ]);

    expect(payments.map((payment) => payment.lastAmountMinor)).toEqual([1499]);
    expect(recurringCandidates(records, [], now, payments)[0]?.payments.map((payment) => payment.amountMinor)).toEqual([
      42000,
    ]);
  });

  test('detects two subscriptions at one shop on their own schedules', () => {
    const records = [
      charge('Apple', '2025-03-14T08:00:00Z', 42000),
      charge('Apple', '2026-03-14T08:00:00Z', 42000),
      charge('Apple', '2026-06-03T08:00:00Z', 1499),
      charge('Apple', '2026-07-03T08:00:00Z', 1499),
      charge('Apple', '2026-08-03T08:00:00Z', 1499),
      charge('Apple', '2026-09-03T08:00:00Z', 1499),
    ];
    const payments = detectRecurringPayments(records, [], now);

    expect(payments.map((payment) => [payment.cadence, payment.lastAmountMinor])).toEqual([
      ['yearly', 42000],
      ['monthly', 1499],
    ]);
    expect(new Set(payments.map((payment) => payment.key)).size).toBe(2);
  });

  test('separates a yearly charge from a more frequent monthly payment', () => {
    const records = [
      ...Array.from({ length: 12 }, (_, month) =>
        charge('Apple', new Date(Date.UTC(2025, 9 + month, 3, 8)).toISOString(), 1499),
      ),
      charge('Apple', '2025-09-14T08:00:00Z', 42000),
      charge('Apple', '2026-09-14T08:00:00Z', 42000),
    ];
    const payments = detectRecurringPayments(records, [], now);

    expect(payments.map((payment) => [payment.cadence, payment.lastAmountMinor])).toEqual([
      ['yearly', 42000],
      ['monthly', 1499],
    ]);
    expect(payments.map((payment) => payment.chargeCount)).toEqual([2, 12]);
    expect(recurringCandidates(records, [], now, payments)).toEqual([]);
  });

  test('keeps a single yearly charge available beside a detected monthly payment', () => {
    const records = [
      ...Array.from({ length: 12 }, (_, month) =>
        charge('Apple', new Date(Date.UTC(2025, 9 + month, 3, 8)).toISOString(), 1499),
      ),
      charge('Apple', '2026-09-14T08:00:00Z', 42000),
    ];
    const payments = detectRecurringPayments(records, [], now);

    expect(payments.map((payment) => [payment.cadence, payment.lastAmountMinor])).toEqual([
      ['monthly', 1499],
    ]);
    expect(recurringCandidates(records, [], now, payments)[0]?.payments).toEqual([
      { amountMinor: 42000, lastChargedAt: '2026-09-14T08:00:00Z', chargeCount: 1 },
    ]);
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
