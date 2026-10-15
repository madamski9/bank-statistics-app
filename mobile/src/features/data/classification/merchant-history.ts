import type { IngestionRecord } from '@bankstats/ingestion-native';

import type { CategorizationRule } from './categorization-rule';
import { classifyTransaction } from './classify-transaction';

export interface HistoryMerchant {
  key: string;
  name: string;
  count: number;
  lastSeenAt: string;
  category?: string;
  categoryName: string;
}

export function merchantHistory(
  records: IngestionRecord[],
  rules: CategorizationRule[],
): HistoryMerchant[] {
  const merchants = new Map<string, HistoryMerchant>();

  for (const record of records) {
    if (record.direction !== 'expense') {
      continue;
    }

    const classified = classifyTransaction(record, rules);

    if (classified.merchantKey === undefined || classified.merchantName === undefined) {
      continue;
    }

    const known = merchants.get(classified.merchantKey);
    const isNewest = known === undefined || record.occurredAt > known.lastSeenAt;

    merchants.set(classified.merchantKey, {
      key: classified.merchantKey,
      name: isNewest ? classified.merchantName : known.name,
      count: (known?.count ?? 0) + 1,
      lastSeenAt: isNewest ? record.occurredAt : known.lastSeenAt,
      category: isNewest ? classified.category : known.category,
      categoryName: isNewest ? classified.categoryName : known.categoryName,
    });
  }

  return [...merchants.values()].sort(
    (left, right) => right.count - left.count || left.name.localeCompare(right.name, 'pl'),
  );
}

export function matchesMerchantQuery(merchant: HistoryMerchant, query: string): boolean {
  const needle = query.trim().toLocaleLowerCase('pl');

  return needle === '' || merchant.name.toLocaleLowerCase('pl').includes(needle);
}
