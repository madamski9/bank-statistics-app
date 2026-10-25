import type { IngestionRecord } from '@bankstats/ingestion-native';

import type { CategorizationRule } from '@/features/data/classification/categorization-rule';
import { classifyTransaction } from '@/features/data/classification/classify-transaction';
import { spendBuckets, type SpendBucket } from '@/features/home/merchants/merchant-detail/merchant-summary';

import { statisticalRecords } from '../record/transaction-record';

export interface MerchantSpendHistory {
  merchantName: string;
  buckets: SpendBucket[];
  highlightedKey: string | null;
  currency: string;
  totalMinor: number;
  count: number;
}

export type BucketChoice = { key: string | null } | null;

function occurredMs(record: IngestionRecord): number {
  return new Date(record.occurredAt).getTime();
}

function bucketKeyAt(buckets: SpendBucket[], timeMs: number): string | null {
  const index = buckets.findIndex(
    (bucket, position) =>
      bucket.startMs <= timeMs && (position === buckets.length - 1 || timeMs < buckets[position + 1].startMs),
  );

  return index === -1 ? null : buckets[index].key;
}

export function merchantSpendHistory(
  record: IngestionRecord,
  history: IngestionRecord[],
  rules: CategorizationRule[],
  endMs: number,
): MerchantSpendHistory | null {
  const classified = classifyTransaction(record, rules);
  const { merchantKey } = classified;

  if (record.direction !== 'expense' || classified.partyKind !== 'merchant' || merchantKey === undefined) {
    return null;
  }

  const payments = statisticalRecords(history).filter((candidate) => {
    if (candidate.direction !== 'expense' || Number.isNaN(occurredMs(candidate))) {
      return false;
    }

    const candidateClass = candidate.id === record.id ? classified : classifyTransaction(candidate, rules);

    return candidateClass.partyKind === 'merchant' && candidateClass.merchantKey === merchantKey;
  });

  if (payments.length < 2) {
    return null;
  }

  const latestMs = Math.max(...payments.map(occurredMs));
  const buckets = spendBuckets(payments, { startMs: null, endMs: Math.max(endMs, latestMs + 1) }, 'all');
  const opened = payments.find((candidate) => candidate.id === record.id);

  return {
    merchantName: classified.merchantName ?? '',
    buckets,
    highlightedKey: opened === undefined ? null : bucketKeyAt(buckets, occurredMs(opened)),
    currency: payments[0].currency,
    totalMinor: payments.reduce((sum, payment) => sum + payment.amountMinor, 0),
    count: payments.length,
  };
}

export function shownBucketKey(history: MerchantSpendHistory, choice: BucketChoice): string | null {
  if (choice === null) {
    return history.highlightedKey;
  }

  if (choice.key === null || history.buckets.some((bucket) => bucket.key === choice.key)) {
    return choice.key;
  }

  return history.highlightedKey;
}
