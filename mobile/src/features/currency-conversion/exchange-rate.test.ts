import type { IngestionRecord } from '@bankstats/ingestion-native';
import { describe, expect, test } from 'bun:test';

import {
  convertedRecords,
  inReportingCurrency,
  occurrenceDate,
  pendingRateRequests,
  reportingAmountMinor,
  withoutExchangeRate,
} from './exchange-rate';

function payment(overrides: Partial<IngestionRecord> = {}): IngestionRecord {
  return {
    id: 'cafe',
    bank: 'millennium',
    direction: 'expense',
    amountMinor: 1250,
    currency: 'EUR',
    occurredAt: '2026-07-04T22:30:00Z',
    capturedAt: '2026-07-04T22:30:00Z',
    sourceApp: 'pl.millenniumbank.bankmillennium',
    status: 'pending',
    ...overrides,
  };
}

describe('exchange rates', () => {
  test('converts with integer arithmetic and rounds half up', () => {
    expect(reportingAmountMinor(1250, '4.2735')).toBe(5342);
    expect(reportingAmountMinor(100, '0.02716')).toBe(3);
    expect(reportingAmountMinor(99_999_999_999, '4.5')).toBe(449_999_999_996);
  });

  test('refuses a rate that is not a decimal number', () => {
    expect(reportingAmountMinor(1250, 'abc')).toBeNull();
    expect(reportingAmountMinor(1250, '-4.2')).toBeNull();
  });

  test('dates a payment by the Polish calendar day it happened on', () => {
    expect(occurrenceDate(payment())).toBe('2026-07-05');
  });

  test('asks once for every foreign currency and day still waiting for a rate', () => {
    const records = [
      payment(),
      payment({ id: 'second' }),
      payment({ id: 'pln', currency: 'PLN' }),
      payment({ id: 'done', reportingAmountMinor: 100 }),
    ];

    expect(pendingRateRequests(records, 10)).toEqual([{ currency: 'EUR', date: '2026-07-05' }]);
  });

  test('stores the snapshot it converted with next to the original amount', () => {
    const [converted] = convertedRecords(
      [payment()],
      [{ currency: 'EUR', requestedDate: '2026-07-05', effectiveDate: '2026-07-03', mid: '4.2735', table: '128/A/NBP/2026' }],
    );

    expect(converted).toMatchObject({
      amountMinor: 1250,
      currency: 'EUR',
      reportingAmountMinor: 5342,
      exchangeRate: '4.2735',
      exchangeRateDate: '2026-07-03',
      exchangeRateTable: '128/A/NBP/2026',
    });
    expect(inReportingCurrency(converted!)).toMatchObject({ amountMinor: 5342, currency: 'PLN' });
    expect(withoutExchangeRate(converted!)).toEqual(payment());
  });

  test('keeps an unconverted foreign payment out of PLN totals', () => {
    expect(inReportingCurrency(payment())).toBeNull();
    expect(inReportingCurrency(payment({ currency: 'PLN' }))).toMatchObject({ amountMinor: 1250 });
  });
});
