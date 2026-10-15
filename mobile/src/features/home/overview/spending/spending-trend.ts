import type { IngestionRecord } from '@bankstats/ingestion-native';

import { bucketSizeFor, bucketSpending, type SpendBucket } from '@/features/home/merchants/merchant-detail/merchant-summary';

import type { PeriodWindow, SpendingPeriod } from '../period/periods';

export interface TrendPoint {
  key: string;
  label: string;
  spokenLabel: string;
}

export interface SpendingTrend {
  points: TrendPoint[];
  expense: number[];
  income: number[];
}

const emptyTrend: SpendingTrend = { points: [], expense: [], income: [] };

function occurredMs(record: IngestionRecord): number {
  return new Date(record.occurredAt).getTime();
}

function totals(buckets: SpendBucket[], frame: SpendBucket[]): number[] {
  return buckets.length === 0 ? frame.map(() => 0) : buckets.map((bucket) => bucket.totalMinor);
}

export function spendingTrend(
  records: IngestionRecord[],
  currency: string,
  window: PeriodWindow,
  period: SpendingPeriod,
): SpendingTrend {
  const inCurrency = records.filter(
    (record) => record.currency === currency && !Number.isNaN(occurredMs(record)),
  );

  if (inCurrency.length === 0) {
    return emptyTrend;
  }

  const aligned: PeriodWindow = {
    startMs: window.startMs ?? Math.min(...inCurrency.map(occurredMs)),
    endMs: window.endMs,
  };
  const size = bucketSizeFor(period, aligned.startMs, aligned.endMs);
  const expense = bucketSpending(
    inCurrency.filter((record) => record.direction === 'expense'),
    aligned,
    size,
  );
  const income = bucketSpending(
    inCurrency.filter((record) => record.direction === 'income'),
    aligned,
    size,
  );
  const frame = expense.length > 0 ? expense : income;

  return {
    points: frame.map(({ key, label, spokenLabel }) => ({ key, label, spokenLabel })),
    expense: totals(expense, frame),
    income: totals(income, frame),
  };
}
