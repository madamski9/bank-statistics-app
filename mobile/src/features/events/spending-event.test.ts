import type { IngestionRecord } from '@bankstats/ingestion-native';
import { describe, expect, test } from 'bun:test';

import { summarizeEvent } from './event-summary';
import {
  activeEvent,
  endedEvent,
  eventIdForRecord,
  eventNameError,
  noEventId,
  type SpendingEvent,
} from './spending-event';

function payment(id: string, occurredAt: string, overrides: Partial<IngestionRecord> = {}): IngestionRecord {
  return {
    id,
    bank: 'millennium',
    direction: 'expense',
    amountMinor: 10_000,
    currency: 'PLN',
    merchant: 'Konzum',
    occurredAt,
    capturedAt: occurredAt,
    sourceApp: 'app',
    status: 'posted',
    origin: 'capture',
    ...overrides,
  };
}

const trip: SpendingEvent = {
  id: 'event-trip',
  name: 'Chorwacja',
  startedAt: '2026-07-01T08:00:00.000Z',
  endedAt: '2026-07-10T20:00:00.000Z',
};
const renovation: SpendingEvent = { id: 'event-flat', name: 'Remont', startedAt: '2026-09-01T08:00:00.000Z' };
const events = [trip, renovation];

describe('events', () => {
  test('collects transactions made while the event lasts', () => {
    expect(eventIdForRecord(payment('a', '2026-07-03T10:00:00Z'), events)).toBe('event-trip');
    expect(eventIdForRecord(payment('b', '2026-07-12T10:00:00Z'), events)).toBeNull();
    expect(eventIdForRecord(payment('c', '2026-09-20T10:00:00Z'), events)).toBe('event-flat');
  });

  test('lets a transaction be assigned or excluded by hand', () => {
    expect(eventIdForRecord(payment('tickets', '2026-05-01T10:00:00Z', { eventId: 'event-trip' }), events)).toBe(
      'event-trip',
    );
    expect(eventIdForRecord(payment('work', '2026-07-03T10:00:00Z', { eventId: noEventId }), events)).toBeNull();
    expect(eventIdForRecord(payment('gone', '2026-05-01T10:00:00Z', { eventId: 'event-deleted' }), events)).toBeNull();
  });

  test('knows the running event and never ends one before it began', () => {
    expect(activeEvent(events)?.id).toBe('event-flat');
    expect(endedEvent(renovation, new Date('2026-08-01T00:00:00Z')).endedAt).toBe(renovation.startedAt);
  });

  test('summarizes spending, income and the daily average of an event', () => {
    const records = [
      payment('a', '2026-07-02T10:00:00Z', { amountMinor: 30_000 }),
      payment('b', '2026-07-05T10:00:00Z', { amountMinor: 60_000 }),
      payment('refund', '2026-07-06T10:00:00Z', { amountMinor: 5_000, direction: 'income' }),
      payment('home', '2026-06-20T10:00:00Z'),
    ];

    const summary = summarizeEvent(records, trip, events, [], new Date('2026-09-30T00:00:00Z'));

    expect(summary).toMatchObject({ expenseMinor: 90_000, incomeMinor: 5_000, count: 3, days: 10, dailyExpenseMinor: 9_000 });
    expect(summary.merchants[0]?.name).toBe('Konzum');
  });

  test('requires a name that fits', () => {
    expect(eventNameError('  ')).not.toBeNull();
    expect(eventNameError('x'.repeat(61))).not.toBeNull();
    expect(eventNameError('Majówka')).toBeNull();
  });

  test('counts a payment entered in the minute the event started', () => {
    const holiday: SpendingEvent = { id: 'event-holiday', name: 'Wakacje', startedAt: '2026-10-15T10:33:45.500Z' };

    expect(eventIdForRecord(payment('coffee', '2026-10-15T10:33:00.000Z'), [holiday])).toBe('event-holiday');
    expect(eventIdForRecord(payment('earlier', '2026-10-15T10:32:00.000Z'), [holiday])).toBeNull();
  });
});

