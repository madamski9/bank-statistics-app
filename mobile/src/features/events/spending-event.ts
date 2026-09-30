import type { IngestionRecord } from '@bankstats/ingestion-native';

import { currentCopy, defineCopy } from '@/features/localization/language';

export interface SpendingEvent {
  id: string;
  name: string;
  startedAt: string;
  endedAt?: string;
}

export const noEventId = 'none';
export const maximumEventNameLength = 60;

const eventCopy = defineCopy({
  pl: {
    enterName: 'Podaj nazwę wydarzenia.',
    nameTooLong: (limit: number) => `Nazwa może mieć najwyżej ${limit} znaków.`,
  },
  en: {
    enterName: 'Enter a name for the event.',
    nameTooLong: (limit: number) => `The name can have at most ${limit} characters.`,
  },
});

export function isSpendingEvent(value: unknown): value is SpendingEvent {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<SpendingEvent>;

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.startedAt === 'string' &&
    (candidate.endedAt === undefined || typeof candidate.endedAt === 'string')
  );
}

export function newSpendingEvent(name: string, now: Date, random: () => number): SpendingEvent {
  const suffix = Math.floor(random() * 0xffffff)
    .toString(36)
    .padStart(5, '0');

  return {
    id: `event-${now.getTime().toString(36)}-${suffix}`,
    name: name.trim(),
    startedAt: now.toISOString(),
  };
}

export function eventNameError(name: string): string | null {
  const copy = currentCopy(eventCopy);
  const trimmed = name.trim();

  if (trimmed === '') {
    return copy.enterName;
  }

  return trimmed.length > maximumEventNameLength ? copy.nameTooLong(maximumEventNameLength) : null;
}

export function endedEvent(event: SpendingEvent, now: Date): SpendingEvent {
  const endedAt = Math.max(now.getTime(), new Date(event.startedAt).getTime());

  return { ...event, endedAt: new Date(endedAt).toISOString() };
}

export function isActive(event: SpendingEvent): boolean {
  return event.endedAt === undefined;
}

export function activeEvent(events: SpendingEvent[]): SpendingEvent | null {
  return (
    events
      .filter(isActive)
      .sort((left, right) => right.startedAt.localeCompare(left.startedAt))[0] ?? null
  );
}

export function sortedEvents(events: SpendingEvent[]): SpendingEvent[] {
  return [...events].sort((left, right) => {
    if (isActive(left) !== isActive(right)) {
      return isActive(left) ? -1 : 1;
    }

    return right.startedAt.localeCompare(left.startedAt);
  });
}

function containsMoment(event: SpendingEvent, momentMs: number): boolean {
  const startMs = new Date(event.startedAt).getTime();
  const endMs = event.endedAt === undefined ? Number.POSITIVE_INFINITY : new Date(event.endedAt).getTime();

  return momentMs >= startMs && momentMs <= endMs;
}

export function eventIdForRecord(record: IngestionRecord, events: SpendingEvent[]): string | null {
  if (record.eventId === noEventId) {
    return null;
  }

  if (record.eventId !== undefined && events.some((event) => event.id === record.eventId)) {
    return record.eventId;
  }

  const occurredMs = new Date(record.occurredAt).getTime();

  if (Number.isNaN(occurredMs)) {
    return null;
  }

  const containing = events
    .filter((event) => containsMoment(event, occurredMs))
    .sort((left, right) => right.startedAt.localeCompare(left.startedAt));

  return containing[0]?.id ?? null;
}

export function recordsOfEvent(
  records: IngestionRecord[],
  event: SpendingEvent,
  events: SpendingEvent[],
): IngestionRecord[] {
  return records.filter((record) => eventIdForRecord(record, events) === event.id);
}
