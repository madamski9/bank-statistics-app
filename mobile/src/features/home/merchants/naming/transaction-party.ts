import type { IngestionRecord } from '@bankstats/ingestion-native';

import type { CategorizationRule } from '@/features/data/classification/categorization-rule';
import { classifyTransaction } from '@/features/data/classification/classify-transaction';
import { transactionKindLabel } from '@/features/home/transactions/record/transaction-record';

export function transactionParty(record: IngestionRecord, rules: CategorizationRule[]): string {
  const classified = classifyTransaction(record, rules);

  return classified.merchantName ?? classified.counterpartyName ?? transactionKindLabel(record);
}
