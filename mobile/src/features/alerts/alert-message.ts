import { categoryLabel } from '@/features/classification/categories';
import { currentCopy } from '@/features/localization/language';
import { formatAmount } from '@/features/spending-overview/formatting';

import type { RaisedAlert } from './alert-delivery';
import type { AlertRule, AlertScope } from './alert-rule';
import { alertsCopy, type ScopeName } from './alerts-copy';

export interface AlertMessage {
  title: string;
  body: string;
}

function scopeName(scope: AlertScope): ScopeName {
  if (scope.kind === 'merchant' || scope.kind === 'counterparty') {
    return { kind: scope.kind, name: scope.name };
  }

  if (scope.kind === 'category') {
    return { kind: 'category', name: categoryLabel(scope.id) };
  }

  return { kind: 'all', name: currentCopy(alertsCopy).allSpending };
}

export function scopeLabel(scope: AlertScope): string {
  return scopeName(scope).name;
}

export function alertMessage(rule: AlertRule, alert: RaisedAlert): AlertMessage {
  const copy = currentCopy(alertsCopy);
  const period = copy.periods[rule.period.kind];
  const reached = formatAmount(alert.amountMinor, alert.currency);
  const target = formatAmount(alert.targetMinor, alert.currency);

  if (rule.condition === 'missingIncome') {
    return {
      title: copy.missingIncomeTitle,
      body: copy.missingIncomeBody(period, reached, target),
    };
  }

  const noun = copy.metrics[rule.metric];
  const scope = scopeName(rule.scope);

  if (alert.share >= 1) {
    return {
      title: copy.reachedTitle(rule.metric, scope),
      body: copy.reachedBody(rule.metric, noun, period, reached, target),
    };
  }

  const remaining = formatAmount(Math.max(alert.targetMinor - alert.amountMinor, 0), alert.currency);

  return {
    title: copy.nearTitle(rule.metric, scope),
    body: copy.nearBody(noun, period, reached, target, remaining),
  };
}
