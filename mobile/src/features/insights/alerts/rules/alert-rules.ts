import type { AlertRule, AlertScope } from './alert-rule';

export interface EntitlementContext {
  isPremium: boolean;
}

export function activeRules(rules: AlertRule[]): AlertRule[] {
  return rules.filter((rule) => rule.isActive);
}

function isSameCategory(left: AlertScope, right: AlertScope): boolean {
  return left.kind === 'category' && right.kind === 'category' && left.id === right.id;
}

export function upsertAlertRule(
  rules: AlertRule[],
  rule: AlertRule,
  { isPremium }: EntitlementContext,
): AlertRule[] {
  const others = rules.filter(
    (existing) => existing.id !== rule.id && !isSameCategory(existing.scope, rule.scope),
  );

  if (isPremium || !rule.isActive) {
    return [...others, rule];
  }

  return [...others.map((existing) => ({ ...existing, isActive: false })), rule];
}

export function removeRule(rules: AlertRule[], id: string): AlertRule[] {
  return rules.filter((rule) => rule.id !== id);
}
