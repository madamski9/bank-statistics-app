import type { IngestionRecord } from '@bankstats/ingestion-native';

import type { SpendingEvent } from '@/features/events/spending-event';

import { dayKey, formatDayHeading } from './format-date';
import { affectsStatistics } from './transaction-record';

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

function eventMarkers(events: SpendingEvent[]): TimedRow[] {
  return events.flatMap((event) => {
    const boundaries: { boundary: EventBoundary; at: string }[] = [{ boundary: 'start', at: event.startedAt }];

    if (event.endedAt !== undefined) {
      boundaries.push({ boundary: 'end', at: event.endedAt });
    }

    return boundaries.map(({ boundary, at }) => ({
      atMs: new Date(at).getTime(),
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
      atMs: new Date(record.occurredAt).getTime(),
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
