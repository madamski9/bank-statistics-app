import type { IngestionRecord } from '@bankstats/ingestion-native';

import type { CategorizationRule } from '@/features/classification/categorization-rule';
import { classifyTransaction } from '@/features/classification/classify-transaction';
import { transactionKindLabel } from '@/features/transactions/transaction-record';

export interface CategoryBreakdownEntry {
  key: string;
  label: string;
  amountMinor: number;
  count: number;
  share: number;
}

function partyOf(
  record: IngestionRecord,
  rules: CategorizationRule[],
): { key: string; label: string } {
  const classified = classifyTransaction(record, rules);

  if (classified.merchantKey !== undefined && classified.merchantName !== undefined) {
    return { key: `merchant:${classified.merchantKey}`, label: classified.merchantName };
  }

  if (classified.counterpartyName !== undefined) {
    return {
      key: `counterparty:${classified.counterpartyName.toLocaleLowerCase('pl')}`,
      label: classified.counterpartyName,
    };
  }

  return { key: `kind:${record.transactionType ?? 'other'}`, label: transactionKindLabel(record) };
}

export function categoryBreakdown(
  records: IngestionRecord[],
  rules: CategorizationRule[],
): CategoryBreakdownEntry[] {
  const byKey = new Map<string, CategoryBreakdownEntry>();
  let total = 0;

  for (const record of records) {
    const party = partyOf(record, rules);
    const existing = byKey.get(party.key);

    total += record.amountMinor;

    if (existing === undefined) {
      byKey.set(party.key, { ...party, amountMinor: record.amountMinor, count: 1, share: 0 });
      continue;
    }

    existing.amountMinor += record.amountMinor;
    existing.count += 1;
  }

  return [...byKey.values()]
    .sort((left, right) => right.amountMinor - left.amountMinor)
    .map((entry) => ({ ...entry, share: total === 0 ? 0 : entry.amountMinor / total }));
}

export function transactionParty(record: IngestionRecord, rules: CategorizationRule[]): string {
  return partyOf(record, rules).label;
}
