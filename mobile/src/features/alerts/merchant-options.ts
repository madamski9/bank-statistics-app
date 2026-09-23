import type { IngestionRecord } from '@bankstats/ingestion-native';

import type { CategorizationRule } from '@/features/classification/categorization-rule';
import { classifyTransaction } from '@/features/classification/classify-transaction';
import { affectsStatistics } from '@/features/transactions/transaction-record';

import type { AlertScope } from './alert-rule';

export function merchantOptions(
  records: IngestionRecord[],
  rules: CategorizationRule[],
): Extract<AlertScope, { kind: 'merchant' }>[] {
  const merchants = new Map<string, Extract<AlertScope, { kind: 'merchant' }>>();

  for (const record of records) {
    if (record.direction !== 'expense' || record.currency !== 'PLN' || !affectsStatistics(record)) {
      continue;
    }

    const classified = classifyTransaction(record, rules);

    if (classified.merchantKey && classified.merchantName) {
      merchants.set(classified.merchantKey, {
        kind: 'merchant',
        key: classified.merchantKey,
        name: classified.merchantName,
      });
    }
  }

  return [...merchants.values()].sort((left, right) => left.name.localeCompare(right.name, 'pl'));
}
