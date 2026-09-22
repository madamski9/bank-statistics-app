import type { IngestionRecord } from '@bankstats/ingestion-native';

import { categoryFromRules, type CategorizationRule } from './categorization-rule';
import { categoryLabel, suggestedCategory } from './categories';
import { resolveMerchant } from './merchant-alias';
import { classifyParty, type PartyKind } from './party';

export interface ClassifiedTransaction {
  partyKind: PartyKind;
  merchantKey?: string;
  merchantName?: string;
  merchantLocation?: string;
  counterpartyName?: string;
  bankLabel?: string;
  category?: string;
  categoryName: string;
  isUncategorized: boolean;
}

const transferCategory = 'transfers';

export function classifyTransaction(
  record: IngestionRecord,
  rules: CategorizationRule[],
): ClassifiedTransaction {
  const party = classifyParty(record);
  const bankLabel = record.merchant?.replace(/\s+/gu, ' ').trim();

  if (party.kind !== 'merchant' || party.name === undefined) {
    const category =
      record.category ??
      (party.kind === 'counterparty' ? transferCategory : undefined);

    return {
      partyKind: party.kind,
      counterpartyName: party.kind === 'counterparty' ? party.name : undefined,
      bankLabel,
      category,
      categoryName: categoryLabel(category),
      isUncategorized: category === undefined,
    };
  }

  const merchant = resolveMerchant(party.name);
  const category =
    record.category ??
    categoryFromRules(record, rules) ??
    suggestedCategory(merchant.name) ??
    undefined;

  return {
    partyKind: 'merchant',
    merchantKey: merchant.key,
    merchantName: merchant.name,
    merchantLocation: party.location,
    bankLabel,
    category,
    categoryName: categoryLabel(category),
    isUncategorized: category === undefined,
  };
}
