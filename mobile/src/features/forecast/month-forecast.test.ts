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
  test('does not treat two spending days as a daily habit without full history', () => {
    const records = [
      expense('a', new Date(2026, 8, 2), 50_000),
      expense('b', new Date(2026, 8, 8), 50_000),
      expense('last-month', new Date(2026, 7, 15), 200_000),
    ];

    const forecast = monthForecast(records, [], now);

    expect(forecast.spentMinor).toBe(100_000);
    expect(forecast.historicalMonthsUsed).toBe(0);
    expect(forecast.projectedVariableMinor).toBe(69_091);
    expect(forecast.projectedMinor).toBe(169_091);
    expect(forecast.previousMonthMinor).toBe(200_000);
  });

  test('uses comparable parts of past months when this month includes a large purchase', () => {
    const records = [
      expense('july-early', new Date(2026, 6, 2), 80_000),
      expense('july-late', new Date(2026, 6, 20), 110_000),
      expense('august-early', new Date(2026, 7, 2), 80_000),
      expense('august-late', new Date(2026, 7, 20), 110_000),
      expense('september-early', new Date(2026, 8, 2), 80_000),
      expense('september-late', new Date(2026, 8, 20), 110_000),
      expense('current-big', new Date(2026, 9, 2), 100_000),
      expense('current-small-1', new Date(2026, 9, 6), 25_000),
      expense('current-small-2', new Date(2026, 9, 9), 25_000),
    ];

    const forecast = monthForecast(records, [], new Date(2026, 9, 10, 12));

    expect(forecast.spentMinor).toBe(150_000);
    expect(forecast.historicalMonthsUsed).toBe(3);
    expect(forecast.projectedMinor).toBeGreaterThan(250_000);
    expect(forecast.projectedMinor).toBeLessThan(300_000);
  });

  test('keeps a first-day one-off from multiplying across the whole month', () => {
    const forecast = monthForecast(
      [expense('one-off', new Date(2026, 8, 1, 9), 150_000)],
      [],
      new Date(2026, 8, 1, 12),
    );

    expect(forecast.spentMinor).toBe(150_000);
    expect(forecast.projectedMinor).toBeLessThan(300_000);
  });

  test('keeps 1500 spent on one day near 2100 instead of projecting 4000', () => {
    const forecast = monthForecast(
      [expense('large-shop', new Date(2026, 9, 8), 150_000)],
      [],
      new Date(2026, 9, 10, 12),
    );

    expect(forecast.spentMinor).toBe(150_000);
    expect(forecast.projectedMinor).toBe(213_000);
  });

  test('keeps two expensive opening days from becoming a month-long trend', () => {
    const forecast = monthForecast(
      [
        expense('opening-one', new Date(2026, 9, 1), 80_000),
        expense('opening-two', new Date(2026, 9, 2), 70_000),
      ],
      [],
      new Date(2026, 9, 2, 12),
    );

    expect(forecast.spentMinor).toBe(150_000);
    expect(forecast.projectedMinor).toBeLessThan(300_000);
  });

  test('still extrapolates an established daily pattern', () => {
    const records = Array.from({ length: 10 }, (_, index) =>
      expense(`day-${index + 1}`, new Date(2026, 8, index + 1), 10_000),
    );

    const forecast = monthForecast(records, [], now);

    expect(forecast.projectedMinor).toBeGreaterThan(250_000);
    expect(forecast.projectedMinor).toBeLessThan(300_000);
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
      isTracked: false,
      records: [rent],
    };

    const forecast = monthForecast([expense('a', new Date(2026, 8, 2), 100_000)], [recurring], now);

    expect(forecast.upcomingRecurringCount).toBe(1);
    expect(forecast.projectedMinor).toBe(384_545);
  });

  test('does not reuse past recurring charges as ordinary future spending', () => {
    const julyRent = expense('rent-july', new Date(2026, 6, 25), 250_000);
    const augustRent = expense('rent-august', new Date(2026, 7, 25), 250_000);
    const recurring: RecurringPayment = {
      key: 'counterparty:landlord',
      name: 'Landlord',
      cadence: 'monthly',
      lastAmountMinor: 250_000,
      previousAmountMinor: 250_000,
      priceChangeMinor: 0,
      monthlyCostMinor: 250_000,
      chargeCount: 3,
      lastChargedAt: augustRent.occurredAt,
      nextExpectedAt: new Date(2026, 8, 25).toISOString(),
      isActive: true,
      isTracked: false,
      records: [augustRent, julyRent],
    };
    const records = [
      expense('july-first', new Date(2026, 6, 1), 10_000),
      julyRent,
      expense('august-first', new Date(2026, 7, 1), 10_000),
      augustRent,
      expense('september', new Date(2026, 8, 2), 100_000),
    ];

    const forecast = monthForecast(records, [recurring], now);

    expect(forecast.historicalMonthsUsed).toBe(2);
    expect(forecast.upcomingRecurringMinor).toBe(250_000);
    expect(forecast.projectedMinor).toBeLessThan(400_000);
  });

  test('does not warn about a limit crossing when the blended forecast stays below it', () => {
    const forecast = monthForecast([expense('a', new Date(2026, 8, 5), 100_000)], [], now, 150_000);

    expect(forecast.limit).toMatchObject({ isExceeded: false, isProjectedOver: false, crossingMs: null });
  });

  test('estimates limit crossing from the forecast when spending is regular', () => {
    const records = Array.from({ length: 10 }, (_, index) =>
      expense(`day-${index + 1}`, new Date(2026, 8, index + 1), 10_000),
    );
    const forecast = monthForecast(records, [], now, 150_000);

    expect(forecast.limit).toMatchObject({ isExceeded: false, isProjectedOver: true });
    expect(new Date(forecast.limit!.crossingMs!).getDate()).toBe(16);
  });
});
