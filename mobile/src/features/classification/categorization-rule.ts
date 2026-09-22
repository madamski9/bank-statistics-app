import type { IngestionRecord } from '@bankstats/ingestion-native';

import { classifyParty } from './party';
import { resolveMerchant } from './merchant-alias';

export interface CategorizationRule {
  merchantKey: string;
  merchantName: string;
  category: string;
  scope: 'private';
}

export function privateRuleFor(merchantLabel: string, category: string): CategorizationRule {
  const merchant = resolveMerchant(merchantLabel);

  return {
    merchantKey: merchant.key,
    merchantName: merchant.name,
    category,
    scope: 'private',
  };
}

export function categoryFromRules(
  record: IngestionRecord,
  rules: CategorizationRule[],
): string | null {
  const party = classifyParty(record);

  if (party.kind !== 'merchant' || party.name === undefined) {
    return null;
  }

  const key = resolveMerchant(party.name).key;

  return rules.find((rule) => rule.merchantKey === key)?.category ?? null;
}

export function upsertRule(
  rules: CategorizationRule[],
  rule: CategorizationRule,
): CategorizationRule[] {
  const others = rules.filter((existing) => existing.merchantKey !== rule.merchantKey);

  return [...others, rule];
}
