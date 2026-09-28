import type { IngestionRecord } from '@bankstats/ingestion-native';

import type { CategorizationRule } from '@/features/classification/categorization-rule';
import { classifyTransaction } from '@/features/classification/classify-transaction';
import { transactionKindLabel } from '@/features/transactions/transaction-record';

export function transactionParty(record: IngestionRecord, rules: CategorizationRule[]): string {
  const classified = classifyTransaction(record, rules);

  return classified.merchantName ?? classified.counterpartyName ?? transactionKindLabel(record);
}
