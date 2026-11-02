import type { IngestionRecord } from '@bankstats/ingestion-native';

import { eventIdForRecord, eventStartMs, type SpendingEvent } from '@/features/insights/events/spending-event';

import { dayKey, formatDayHeading } from '@/features/app-shell/formatting/format-date';
import { affectsStatistics } from '../record/transaction-record';

export type EventBoundary = 'start' | 'end';

export type HistoryRow =
  | { kind: 'record'; key: string; record: IngestionRecord }
  | { kind: 'marker'; key: string; event: SpendingEvent; boundary: EventBoundary };

export interface DaySection {
  key: string;
  title: string;
  totalMinor: number;
  currency: string | null;
  data: HistoryRow[];
}

interface TimedRow {
  atMs: number;
  order: number;
  row: HistoryRow;
}

function recordMoment(record: IngestionRecord, events: SpendingEvent[]): number {
  const occurredMs = new Date(record.occurredAt).getTime();
  const eventId = eventIdForRecord(record, events);
  const event = eventId === null ? undefined : events.find((candidate) => candidate.id === eventId);

  if (event === undefined || Number.isNaN(occurredMs)) {
    return occurredMs;
  }

  const startMs = eventStartMs(event);
  const endMs = event.endedAt === undefined ? Number.POSITIVE_INFINITY : new Date(event.endedAt).getTime();

  return Math.min(Math.max(occurredMs, startMs), endMs);
}

function eventMarkers(events: SpendingEvent[]): TimedRow[] {
  return events.flatMap((event) => {
    const boundaries: { boundary: EventBoundary; at: string }[] = [{ boundary: 'start', at: event.startedAt }];

    if (event.endedAt !== undefined) {
      boundaries.push({ boundary: 'end', at: event.endedAt });
    }

    return boundaries.map(({ boundary, at }) => ({
      atMs: boundary === 'start' ? eventStartMs(event) : new Date(at).getTime(),
      order: boundary === 'end' ? 0 : 2,
      row: { kind: 'marker' as const, key: `${event.id}-${boundary}`, event, boundary },
    }));
  });
}

export function buildSections(
  records: IngestionRecord[],
  reference: Date,
  events: SpendingEvent[] = [],
): DaySection[] {
  const sections = new Map<string, DaySection>();
  const rows: TimedRow[] = [
    ...records.map((record) => ({
      atMs: recordMoment(record, events),
      order: 1,
      row: { kind: 'record' as const, key: record.id, record },
    })),
    ...eventMarkers(events),
  ];

  rows
    .filter(({ atMs }) => !Number.isNaN(atMs))
    .sort((left, right) => right.atMs - left.atMs || left.order - right.order)
    .forEach(({ atMs, row }) => {
      const occurredAt = new Date(atMs);
      const key = dayKey(occurredAt);
      let section = sections.get(key);

      if (section === undefined) {
        section = {
          key,
          title: formatDayHeading(occurredAt, reference),
          totalMinor: 0,
          currency: null,
          data: [],
        };
        sections.set(key, section);
      }

      section.data.push(row);

      if (row.kind === 'record') {
        const { record } = row;
        section.currency ??= record.currency;

        if (affectsStatistics(record)) {
          section.totalMinor += record.direction === 'income' ? record.amountMinor : -record.amountMinor;
        }
      }
    });

  return [...sections.values()];
}

export const historyPageSize = 100;

export interface VisibleHistory {
  sections: DaySection[];
  hasMore: boolean;
}

export function firstDays(sections: DaySection[], rowLimit: number): VisibleHistory {
  const visible: DaySection[] = [];
  let shownRows = 0;

  for (const section of sections) {
    if (shownRows >= rowLimit) {
      return { sections: visible, hasMore: true };
    }

    visible.push(section);
    shownRows += section.data.length;
  }

  return { sections: visible, hasMore: false };
}
