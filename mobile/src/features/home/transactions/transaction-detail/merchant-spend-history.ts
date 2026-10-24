import type { IngestionRecord } from '@bankstats/ingestion-native';

import type { CategorizationRule } from '@/features/data/classification/categorization-rule';
import { classifyTransaction } from '@/features/data/classification/classify-transaction';
import { groupSpending } from '@/features/data/classification/spending-groups';
import {
  bucketSizeFor,
  bucketSpending,
  chartWindow,
  earliestOccurredMs,
  type SpendBucket,
} from '@/features/home/merchants/merchant-detail/merchant-summary';

import { statisticalRecords } from '../record/transaction-record';

export interface MerchantSpendHistory {
  merchantName: string;
  buckets: SpendBucket[];
  highlightedKey: string | null;
  currency: string;
  totalMinor: number;
  count: number;
}

function bucketKeyAt(buckets: SpendBucket[], occurredMs: number): string | null {
  if (Number.isNaN(occurredMs)) {
    return null;
  }

  const containing = buckets.filter((bucket) => bucket.startMs <= occurredMs).at(-1);

  return containing?.key ?? null;
}

export function merchantSpendHistory(
  record: IngestionRecord,
  history: IngestionRecord[],
  rules: CategorizationRule[],
  endMs: number,
): MerchantSpendHistory | null {
  const classified = classifyTransaction(record, rules);

  if (record.direction !== 'expense' || classified.partyKind !== 'merchant' || classified.merchantKey === undefined) {
    return null;
  }

  const spendWindow = { startMs: null, endMs };
  const group = groupSpending(statisticalRecords(history), { window: spendWindow, rules, dimension: 'merchant' }).find(
    (candidate) => candidate.key === classified.merchantKey,
  );

  if (group === undefined || group.count < 2) {
    return null;
  }

  const earliestMs = earliestOccurredMs(group.records);
  const size = bucketSizeFor('all', earliestMs, endMs);
  const buckets = bucketSpending(group.records, chartWindow(spendWindow, size, earliestMs), size);

  return {
    merchantName: group.name,
    buckets,
    highlightedKey: bucketKeyAt(buckets, new Date(record.occurredAt).getTime()),
    currency: group.currency,
    totalMinor: group.totalMinor,
    count: group.count,
  };
}
