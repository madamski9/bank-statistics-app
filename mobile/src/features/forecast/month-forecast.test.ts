import type { IngestionRecord } from '@bankstats/ingestion-native';
import { describe, expect, test } from 'bun:test';

import type { RecurringPayment } from '@/features/subscriptions/recurring-payments';

import { monthForecast } from './month-forecast';

function expense(id: string, occurredAt: Date, amountMinor: number): IngestionRecord {
  return {
    id,
    bank: 'manual',
    direction: 'expense',
    amountMinor,
    currency: 'PLN',
    occurredAt: occurredAt.toISOString(),
    capturedAt: occurredAt.toISOString(),
    sourceApp: 'manual',
    status: 'posted',
    origin: 'manual',
  };
}

const now = new Date(2026, 8, 11, 0, 0, 0);

describe('month forecast', () => {
  test('projects the spending pace over the rest of the month', () => {
    const records = [
      expense('a', new Date(2026, 8, 2), 50_000),
      expense('b', new Date(2026, 8, 8), 50_000),
      expense('last-month', new Date(2026, 7, 15), 200_000),
    ];

    const forecast = monthForecast(records, [], now);

    expect(forecast.spentMinor).toBe(100_000);
    expect(forecast.dailyPaceMinor).toBe(10_000);
    expect(forecast.projectedMinor).toBe(300_000);
    expect(forecast.previousMonthMinor).toBe(200_000);
  });

  test('adds recurring payments still due this month instead of spreading them', () => {
    const rent = expense('rent-august', new Date(2026, 7, 25), 250_000);
    const recurring: RecurringPayment = {
      key: 'counterparty:landlord',
      name: 'Landlord',
      cadence: 'monthly',
      lastAmountMinor: 250_000,
      previousAmountMinor: 250_000,
      priceChangeMinor: 0,
      monthlyCostMinor: 250_000,
      chargeCount: 3,
      lastChargedAt: rent.occurredAt,
      nextExpectedAt: new Date(2026, 8, 25).toISOString(),
      isActive: true,
      records: [rent],
    };

    const forecast = monthForecast([expense('a', new Date(2026, 8, 2), 100_000)], [recurring], now);

    expect(forecast.upcomingRecurringCount).toBe(1);
    expect(forecast.projectedMinor).toBe(100_000 + 10_000 * 20 + 250_000);
  });

  test('tells when the monthly limit will be crossed at this pace', () => {
    const forecast = monthForecast([expense('a', new Date(2026, 8, 5), 100_000)], [], now, 150_000);

    expect(forecast.limit).toMatchObject({ isExceeded: false, isProjectedOver: true });
    expect(new Date(forecast.limit!.crossingMs!).getDate()).toBe(16);
  });
});
