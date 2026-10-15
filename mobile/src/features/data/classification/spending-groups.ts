import type { IngestionRecord } from '@bankstats/ingestion-native';

import { isWithinWindow, type PeriodWindow } from '@/features/home/overview/period/periods';
import { affectsStatistics } from '@/features/home/transactions/record/transaction-record';

import { type CategorizationRule } from './categorization-rule';
import { uncategorizedCategory } from './categories';
import { classifyTransaction, type ClassifiedTransaction } from './classify-transaction';

export type SpendingDimension = 'merchant' | 'counterparty' | 'category';

export interface SpendingGroup {
  key: string;
  name: string;
  subtitle?: string;
  dimension: SpendingDimension;
  totalMinor: number;
  count: number;
  share: number;
  averageMinor: number;
  lastOccurredMs: number;
  currency: string;
  records: IngestionRecord[];
}

export interface GroupingOptions {
  window: PeriodWindow;
  rules: CategorizationRule[];
  dimension: SpendingDimension;
}

interface GroupSeed {
  key: string;
  name: string;
  subtitle?: string;
}

function occurredMs(record: IngestionRecord): number {
  return new Date(record.occurredAt).getTime();
}

function seedFor(
  classified: ClassifiedTransaction,
  dimension: SpendingDimension,
): GroupSeed | null {
  if (dimension === 'merchant') {
    return classified.partyKind === 'merchant' && classified.merchantKey !== undefined
      ? {
          key: classified.merchantKey,
          name: classified.merchantName ?? '',
          subtitle: classified.merchantLocation,
        }
      : null;
  }

  if (dimension === 'counterparty') {
    return classified.partyKind === 'counterparty' && classified.counterpartyName !== undefined
      ? { key: classified.counterpartyName.toLocaleLowerCase('pl'), name: classified.counterpartyName }
      : null;
  }

  return { key: classified.category ?? uncategorizedCategory, name: classified.categoryName };
}

export interface PartyGroupReference {
  dimension: Exclude<SpendingDimension, 'category'>;
  key: string;
}

export function partyGroupReference(classified: ClassifiedTransaction): PartyGroupReference | null {
  if (classified.partyKind === 'unknown') {
    return null;
  }

  const seed = seedFor(classified, classified.partyKind);

  return seed === null ? null : { dimension: classified.partyKind, key: seed.key };
}

export function groupSpending(
  records: IngestionRecord[],
  { window, rules, dimension }: GroupingOptions,
): SpendingGroup[] {
  const expenses = records.filter(
    (record) =>
      record.direction === 'expense' &&
      affectsStatistics(record) &&
      !Number.isNaN(occurredMs(record)) &&
      isWithinWindow(record.occurredAt, window),
  );
  const byKey = new Map<string, SpendingGroup>();
  let total = 0;

  for (const record of expenses) {
    const seed = seedFor(classifyTransaction(record, rules), dimension);

    if (seed === null) {
      continue;
    }

    total += record.amountMinor;

    const existing = byKey.get(seed.key);

    if (existing === undefined) {
      byKey.set(seed.key, {
        ...seed,
        dimension,
        totalMinor: record.amountMinor,
        count: 1,
        share: 0,
        averageMinor: record.amountMinor,
        lastOccurredMs: occurredMs(record),
        currency: record.currency,
        records: [record],
      });
      continue;
    }

    existing.totalMinor += record.amountMinor;
    existing.count += 1;
    existing.records.push(record);
    existing.subtitle = existing.subtitle ?? seed.subtitle;
    existing.lastOccurredMs = Math.max(existing.lastOccurredMs, occurredMs(record));
  }

  const ranked = [...byKey.values()].sort((left, right) => right.totalMinor - left.totalMinor);

  for (const group of ranked) {
    group.share = total === 0 ? 0 : group.totalMinor / total;
    group.averageMinor = Math.round(group.totalMinor / group.count);
    group.records.sort((left, right) => occurredMs(right) - occurredMs(left));
  }

  return ranked;
}
