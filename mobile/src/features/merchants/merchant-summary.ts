import type { IngestionRecord } from '@bankstats/ingestion-native';

import { isWithinWindow, type PeriodWindow, type SpendingPeriod } from '@/features/spending-overview/periods';

import { merchantKey, splitMerchant } from './merchant-name';

export interface MerchantSpending {
  key: string;
  name: string;
  location?: string;
  totalMinor: number;
  count: number;
  /** Fraction of all named spending in the window. */
  share: number;
  averageMinor: number;
  lastOccurredMs: number;
  currency: string;
  /** Newest first, for the history list. */
  records: IngestionRecord[];
}

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

const shortMonths = [
  'sty',
  'lut',
  'mar',
  'kwi',
  'maj',
  'cze',
  'lip',
  'sie',
  'wrz',
  'paź',
  'lis',
  'gru',
];

const longMonths = [
  'stycznia',
  'lutego',
  'marca',
  'kwietnia',
  'maja',
  'czerwca',
  'lipca',
  'sierpnia',
  'września',
  'października',
  'listopada',
  'grudnia',
];

function occurredMs(record: IngestionRecord): number {
  return new Date(record.occurredAt).getTime();
}

/**
 * Shops only. A transfer carries no merchant, and listing it here as "Inne" would put a
 * category into a ranking of places.
 */
function namedExpenses(records: IngestionRecord[], window: PeriodWindow): IngestionRecord[] {
  return records.filter(
    (record) =>
      record.direction === 'expense' &&
      record.transactionType !== 'outgoingTransfer' &&
      record.merchant !== undefined &&
      record.merchant.trim() !== '' &&
      !Number.isNaN(occurredMs(record)) &&
      isWithinWindow(record.occurredAt, window),
  );
}

export function rankMerchants(
  records: IngestionRecord[],
  window: PeriodWindow,
): MerchantSpending[] {
  const expenses = namedExpenses(records, window);
  const byKey = new Map<string, MerchantSpending>();

  for (const record of expenses) {
    const { name, location } = splitMerchant(record.merchant ?? '');
    const key = merchantKey(name);
    const existing = byKey.get(key);
    const occurred = occurredMs(record);

    if (existing === undefined) {
      byKey.set(key, {
        key,
        name,
        location,
        totalMinor: record.amountMinor,
        count: 1,
        share: 0,
        averageMinor: record.amountMinor,
        lastOccurredMs: occurred,
        currency: record.currency,
        records: [record],
      });
      continue;
    }

    existing.totalMinor += record.amountMinor;
    existing.count += 1;
    existing.records.push(record);
    existing.location = existing.location ?? location;
    existing.lastOccurredMs = Math.max(existing.lastOccurredMs, occurred);
  }

  const total = expenses.reduce((sum, record) => sum + record.amountMinor, 0);
  const ranked = [...byKey.values()].sort((left, right) => right.totalMinor - left.totalMinor);

  for (const merchant of ranked) {
    merchant.share = total === 0 ? 0 : merchant.totalMinor / total;
    merchant.averageMinor = Math.round(merchant.totalMinor / merchant.count);
    merchant.records.sort((left, right) => occurredMs(right) - occurredMs(left));
  }

  return ranked;
}

/** Keep the bar count readable: a year of days would be 365 slivers. */
export function bucketSizeFor(period: SpendingPeriod): BucketSize {
  if (period === 'week' || period === 'month') {
    return 'day';
  }

  return period === 'quarter' ? 'week' : 'month';
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
  if (size === 'month') {
    return {
      label: shortMonths[start.getMonth()],
      spokenLabel: `${longMonths[start.getMonth()]} ${start.getFullYear()}`,
    };
  }

  const day = `${start.getDate()}.${String(start.getMonth() + 1).padStart(2, '0')}`;
  const spokenDay = `${start.getDate()} ${longMonths[start.getMonth()]}`;

  return {
    label: day,
    spokenLabel: size === 'week' ? `tydzień od ${spokenDay}` : spokenDay,
  };
}

/**
 * Every bucket in the window, including the empty ones — a gap in spending is information,
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

export function formatDayMonth(ms: number): string {
  const date = new Date(ms);

  return `${date.getDate()} ${longMonths[date.getMonth()]}`;
}

export const millisecondsPerDay = dayMs;
