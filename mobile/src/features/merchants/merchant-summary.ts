import type { IngestionRecord } from '@bankstats/ingestion-native';

import { calendarCopy } from '@/features/localization/calendar-copy';
import { currentCopy, defineCopy } from '@/features/localization/language';
import type { PeriodWindow, SpendingPeriod } from '@/features/spending-overview/periods';

const bucketCopy = defineCopy({
  pl: { weekFrom: (day: string) => `tydzień od ${day}` },
  en: { weekFrom: (day: string) => `week of ${day}` },
});

export type BucketSize = 'day' | 'week' | 'month';

export interface SpendBucket {
  key: string;
  /** Short axis label; only some are rendered. */
  label: string;
  /** Spoken by screen readers, so it is written out in full. */
  spokenLabel: string;
  startMs: number;
  totalMinor: number;
  count: number;
}

const dayMs = 86_400_000;

function occurredMs(record: IngestionRecord): number {
  return new Date(record.occurredAt).getTime();
}

export function earliestOccurredMs(records: IngestionRecord[]): number | null {
  const times = records.map(occurredMs).filter((time) => !Number.isNaN(time));

  return times.length === 0 ? null : Math.min(...times);
}

export function bucketSizeFor(
  period: SpendingPeriod,
  earliestMs: number | null = null,
  endMs: number = Date.now(),
): BucketSize {
  if (period === 'currentMonth' || period === 'week' || period === 'month' || period === 'quarter') {
    return 'day';
  }

  if (period === 'year') {
    return 'week';
  }

  if (earliestMs === null) {
    return 'month';
  }

  const spanDays = (endMs - earliestMs) / dayMs;

  if (spanDays <= 92) {
    return 'day';
  }

  return spanDays <= 730 ? 'week' : 'month';
}

function startOfBucket(date: Date, size: BucketSize): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (size === 'month') {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  if (size === 'week') {
    /** Monday-based, the week Poland reads. */
    const weekday = (start.getDay() + 6) % 7;

    start.setDate(start.getDate() - weekday);
  }

  return start;
}

function nextBucket(start: Date, size: BucketSize): Date {
  if (size === 'month') {
    return new Date(start.getFullYear(), start.getMonth() + 1, 1);
  }

  const next = new Date(start);

  next.setDate(next.getDate() + (size === 'week' ? 7 : 1));

  return next;
}

function bucketLabels(start: Date, size: BucketSize): { label: string; spokenLabel: string } {
  const calendar = currentCopy(calendarCopy);

  if (size === 'month') {
    return {
      label: calendar.shortMonths[start.getMonth()],
      spokenLabel: `${calendar.monthNames[start.getMonth()]} ${start.getFullYear()}`,
    };
  }

  const day = `${start.getDate()}.${String(start.getMonth() + 1).padStart(2, '0')}`;
  const spokenDay = calendar.dayMonth(start.getDate(), calendar.monthsInGenitive[start.getMonth()]);

  return {
    label: day,
    spokenLabel: size === 'week' ? currentCopy(bucketCopy).weekFrom(spokenDay) : spokenDay,
  };
}

/**
 * Every bucket in the window, including the empty ones - a gap in spending is information,
 * and dropping it would make the axis lie about time.
 */
export function bucketSpending(
  records: IngestionRecord[],
  window: PeriodWindow,
  size: BucketSize,
): SpendBucket[] {
  const relevant = records.filter((record) => !Number.isNaN(occurredMs(record)));

  if (relevant.length === 0) {
    return [];
  }

  const earliest = Math.min(...relevant.map(occurredMs));
  const from = startOfBucket(new Date(window.startMs ?? earliest), size);
  const buckets: SpendBucket[] = [];
  let cursor = from;

  /** Guarded: a corrupt window must not spin here. */
  while (cursor.getTime() < window.endMs && buckets.length < 400) {
    const next = nextBucket(cursor, size);
    const startMs = cursor.getTime();
    const endMs = next.getTime();
    const inBucket = relevant.filter((record) => {
      const occurred = occurredMs(record);

      return occurred >= startMs && occurred < endMs;
    });

    buckets.push({
      key: String(startMs),
      ...bucketLabels(cursor, size),
      startMs,
      totalMinor: inBucket.reduce((sum, record) => sum + record.amountMinor, 0),
      count: inBucket.length,
    });

    cursor = next;
  }

  return buckets;
}

const minimumChartDays = 14;

export function chartWindow(
  window: PeriodWindow,
  size: BucketSize,
  earliestMs: number | null,
): PeriodWindow {
  if (window.startMs !== null || size !== 'day' || earliestMs === null) {
    return window;
  }

  return { ...window, startMs: Math.min(earliestMs, window.endMs - minimumChartDays * dayMs) };
}

export function formatDayMonth(ms: number): string {
  const date = new Date(ms);
  const calendar = currentCopy(calendarCopy);

  return calendar.dayMonth(date.getDate(), calendar.monthsInGenitive[date.getMonth()]);
}

export const millisecondsPerDay = dayMs;
