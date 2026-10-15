import type { IngestionRecord } from '@bankstats/ingestion-native';

import {
  bucketSizeFor,
  bucketSpending,
  earliestOccurredMs,
  type BucketSize,
  type SpendBucket,
} from '@/features/home/merchants/merchant-detail/merchant-summary';
import type { PeriodWindow, SpendingPeriod } from '../period/periods';

export interface ExpenseRhythm {
  size: BucketSize;
  buckets: SpendBucket[];
}

export function expenseRhythm(
  records: IngestionRecord[],
  currency: string,
  window: PeriodWindow,
  period: SpendingPeriod,
): ExpenseRhythm {
  const expenses = records.filter(
    (record) => record.direction === 'expense' && record.currency === currency,
  );
  const size = bucketSizeFor(period, earliestOccurredMs(expenses), window.endMs);

  return { size, buckets: bucketSpending(expenses, window, size) };
}

export function rhythmAverageMinor(buckets: SpendBucket[]): number {
  if (buckets.length === 0) {
    return 0;
  }

  return Math.round(buckets.reduce((sum, bucket) => sum + bucket.totalMinor, 0) / buckets.length);
}

export function rhythmPeak(buckets: SpendBucket[]): SpendBucket | null {
  return buckets.reduce<SpendBucket | null>(
    (highest, bucket) =>
      bucket.totalMinor > 0 && (highest === null || bucket.totalMinor > highest.totalMinor)
        ? bucket
        : highest,
    null,
  );
}
