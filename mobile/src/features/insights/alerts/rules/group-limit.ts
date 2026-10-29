import type { IngestionRecord } from '@bankstats/ingestion-native';

import type { CategorizationRule } from '@/features/data/classification/categorization-rule';
import type { SpendingGroup } from '@/features/data/classification/spending-groups';
import { currentCopy } from '@/features/app-shell/localization/language';

import { alertsCopy } from '../alerts-copy';
import { alertProgress } from '../evaluation/alert-evaluation';
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

export function isSameScope(left: AlertScope, right: AlertScope): boolean {
  if (left.kind === 'merchant' && right.kind === 'merchant') {
    return left.key === right.key;
  }

  if (left.kind === 'counterparty' && right.kind === 'counterparty') {
    return left.name === right.name;
  }

  if (left.kind === 'category' && right.kind === 'category') {
    return left.id === right.id;
  }

  return left.kind === right.kind;
}

export function ruleForScope(rules: AlertRule[], scope: AlertScope): AlertRule | null {
  return rules.find((rule) => isSameScope(rule.scope, scope)) ?? null;
}

export function conflictingRule(rules: AlertRule[], scope: AlertScope, ruleId: string | null): AlertRule | null {
  if (scope.kind === 'all') {
    return null;
  }

  return rules.find((rule) => rule.id !== ruleId && isSameScope(rule.scope, scope)) ?? null;
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
