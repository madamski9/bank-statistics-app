import type { IngestionRecord } from '@bankstats/ingestion-native';
import { describe, expect, test } from 'bun:test';

import type { SpendingEvent } from '@/features/insights/events/spending-event';

import { dayKey } from '@/features/app-shell/formatting/format-date';
import { buildSections, firstDays } from './history-sections';

function payment(id: string, occurredAt: string): IngestionRecord {
  return {
    id,
    bank: 'millennium',
    direction: 'expense',
    amountMinor: 1_000,
    currency: 'PLN',
    merchant: 'Konzum',
    occurredAt,
    capturedAt: occurredAt,
    sourceApp: 'app',
    status: 'posted',
    origin: 'capture',
  };
}

const reference = new Date('2026-07-20T12:00:00.000Z');
const records = [
  payment('after', '2026-07-12T10:00:00.000Z'),
  payment('inside-late', '2026-07-09T10:00:00.000Z'),
  payment('inside-early', '2026-07-02T10:00:00.000Z'),
  payment('before', '2026-06-28T10:00:00.000Z'),
];

function rowKeys(events: SpendingEvent[], source = records): string[] {
  return buildSections(source, reference, events).flatMap((section) => section.data.map((row) => row.key));
}

describe('history sections', () => {
  test('frames an ended event between its end and start lines', () => {
    const trip: SpendingEvent = {
      id: 'trip',
      name: 'Chorwacja',
      startedAt: '2026-07-01T08:00:00.000Z',
      endedAt: '2026-07-10T20:00:00.000Z',
    };

    expect(rowKeys([trip])).toEqual(['after', 'trip-end', 'inside-late', 'inside-early', 'trip-start', 'before']);
  });

  test('puts the start line of an ongoing event below its transactions only', () => {
    const trip: SpendingEvent = { id: 'trip', name: 'Chorwacja', startedAt: '2026-07-05T08:00:00.000Z' };

    expect(rowKeys([trip])).toEqual(['after', 'inside-late', 'trip-start', 'inside-early', 'before']);
  });

  test('keeps a line newer than every transaction at the very top', () => {
    const fresh: SpendingEvent = { id: 'fresh', name: 'Remont', startedAt: '2026-07-15T08:00:00.000Z' };

    expect(rowKeys([fresh])[0]).toBe('fresh-start');
  });

  test('groups event lines under their own date even without a transaction that day', () => {
    const trip: SpendingEvent = {
      id: 'trip',
      name: 'Chorwacja',
      startedAt: '2026-07-01T08:00:00.000Z',
      endedAt: '2026-07-10T20:00:00.000Z',
    };
    const sections = buildSections(records, reference, [trip]);
    const endKey = dayKey(new Date(trip.endedAt!));

    expect(sections.map((section) => section.key)).toContain(endKey);
    expect(sections.find((section) => section.key === endKey)?.data.map((row) => row.key)).toEqual(['trip-end']);
    expect(sections.find((section) => section.key === endKey)?.currency).toBeNull();
    expect(buildSections([], reference, [trip]).flatMap((section) => section.data.map((row) => row.key))).toEqual([
      'trip-end',
      'trip-start',
    ]);
  });

  test('keeps day totals free of lines', () => {
    const trip: SpendingEvent = { id: 'trip', name: 'Chorwacja', startedAt: '2026-07-05T08:00:00.000Z' };
    const sections = buildSections(records, reference, [trip]);

    expect(sections.filter((section) => section.currency !== null).map((section) => section.totalMinor)).toEqual([
      -1_000,
      -1_000,
      -1_000,
      -1_000,
    ]);
  });

  test('puts a payment added in the minute an event started above its start line', () => {
    const trip: SpendingEvent = { id: 'trip', name: 'Wakacje', startedAt: '2026-07-15T08:33:45.120Z' };
    const added = payment('added', '2026-07-15T08:33:00.000Z');

    expect(rowKeys([trip], [added, ...records]).slice(0, 3)).toEqual(['added', 'trip-start', 'after']);
  });

  test('keeps a payment assigned to an event by hand inside its lines', () => {
    const trip: SpendingEvent = {
      id: 'trip',
      name: 'Chorwacja',
      startedAt: '2026-07-01T08:00:00.000Z',
      endedAt: '2026-07-10T20:00:00.000Z',
    };
    const assigned = { ...payment('assigned', '2026-06-30T09:00:00.000Z'), eventId: 'trip' };

    expect(rowKeys([trip], [assigned, ...records])).toEqual([
      'after',
      'trip-end',
      'inside-late',
      'inside-early',
      'assigned',
      'trip-start',
      'before',
    ]);
  });
});

describe('showing the history a page at a time', () => {
  const month = Array.from({ length: 30 }, (_, index) => {
    const day = String(30 - index).padStart(2, '0');

    return [
      payment(`${day}-morning`, `2026-06-${day}T08:00:00.000Z`),
      payment(`${day}-evening`, `2026-06-${day}T18:00:00.000Z`),
    ];
  }).flat();
  const sections = buildSections(month, reference);

  test('shows the newest days until the page is full', () => {
    const { sections: visible, hasMore } = firstDays(sections, 10);

    expect(visible.map((section) => section.key)).toEqual(sections.slice(0, 5).map((section) => section.key));
    expect(hasMore).toBe(true);
  });

  test('never cuts a day in half, so its total stays complete', () => {
    const { sections: visible } = firstDays(sections, 9);
    const lastDay = visible.at(-1);

    expect(visible).toHaveLength(5);
    expect(lastDay?.data).toHaveLength(2);
    expect(lastDay?.totalMinor).toBe(-2_000);
  });

  test('shows everything once the page reaches the oldest day', () => {
    expect(firstDays(sections, 60)).toEqual({ sections, hasMore: false });
    expect(firstDays(sections, 1_000).hasMore).toBe(false);
  });

  test('shows nothing more for an empty history', () => {
    expect(firstDays([], 100)).toEqual({ sections: [], hasMore: false });
  });
});
