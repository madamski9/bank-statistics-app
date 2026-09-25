import type { IngestionRecord } from '@bankstats/ingestion-native';

import type { CategorizationRule } from '@/features/classification/categorization-rule';
import type { SpendingGroup } from '@/features/classification/spending-groups';
import { currentCopy } from '@/features/localization/language';

import { alertsCopy } from './alerts-copy';
import { alertProgress } from './alert-evaluation';
import type { AlertRule, AlertScope } from './alert-rule';

export interface GroupLimit {
  rule: AlertRule;
  amountMinor: number;
  targetMinor: number;
  share: number;
  currency: string;
  periodLabel: string;
}

export function scopeForGroup(group: SpendingGroup): AlertScope {
  if (group.dimension === 'merchant') {
    return { kind: 'merchant', key: group.key, name: group.name };
  }

  if (group.dimension === 'counterparty') {
    return { kind: 'counterparty', name: group.name };
  }

  return { kind: 'category', id: group.key };
}

export function ruleForScope(rules: AlertRule[], scope: AlertScope): AlertRule | null {
  return (
    rules.find((rule) => {
      if (rule.scope.kind !== scope.kind) {
        return false;
      }

      if (rule.scope.kind === 'merchant' && scope.kind === 'merchant') {
        return rule.scope.key === scope.key;
      }

      if (rule.scope.kind === 'counterparty' && scope.kind === 'counterparty') {
        return rule.scope.name === scope.name;
      }

      if (rule.scope.kind === 'category' && scope.kind === 'category') {
        return rule.scope.id === scope.id;
      }

      return true;
    }) ?? null
  );
}

export function groupLimit(
  group: SpendingGroup,
  rules: AlertRule[],
  records: IngestionRecord[],
  categorizationRules: CategorizationRule[],
  reference: Date,
): GroupLimit | null {
  const rule = ruleForScope(rules, scopeForGroup(group));

  if (rule === null) {
    return null;
  }

  const progress = alertProgress(rule, records, { reference, rules: categorizationRules });

  return {
    rule,
    amountMinor: progress.amountMinor,
    targetMinor: progress.targetMinor,
    share: progress.share,
    currency: progress.currency,
    periodLabel: currentCopy(alertsCopy).limitPeriods[rule.period.kind],
  };
}
