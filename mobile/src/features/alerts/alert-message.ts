import { categoryLabel } from '@/features/classification/categories';
import { formatAmount } from '@/features/spending-overview/formatting';

import type { RaisedAlert } from './alert-delivery';
import type { AlertPeriod } from './alert-period';
import type { AlertRule, AlertScope } from './alert-rule';

export interface AlertMessage {
  title: string;
  body: string;
}

const periodLabels: Record<AlertPeriod['kind'], string> = {
  week: 'w tym tygodniu',
  month: 'w tym miesiącu',
  year: 'w tym roku',
  custom: 'w wybranym okresie',
};

export function scopeLabel(scope: AlertScope): string {
  if (scope.kind === 'merchant') {
    return scope.name;
  }

  if (scope.kind === 'counterparty') {
    return scope.name;
  }

  if (scope.kind === 'category') {
    return categoryLabel(scope.id);
  }

  return 'wszystkie wydatki';
}

function titleScope(scope: AlertScope): string {
  if (scope.kind === 'merchant') {
    return ` w ${scope.name}`;
  }

  if (scope.kind === 'counterparty') {
    return ` dla ${scope.name}`;
  }

  if (scope.kind === 'category') {
    return ` w kategorii ${categoryLabel(scope.id)}`;
  }

  return ' wydatków';
}

export function alertMessage(rule: AlertRule, alert: RaisedAlert): AlertMessage {
  const period = periodLabels[rule.period.kind];
  const reached = formatAmount(alert.amountMinor, alert.currency);
  const target = formatAmount(alert.targetMinor, alert.currency);

  if (rule.condition === 'missingIncome') {
    return {
      title: 'Brak spodziewanego wpływu',
      body: `Wpływy ${period}: ${reached} z oczekiwanych ${target}.`,
    };
  }

  if (alert.share >= 1) {
    return {
      title: `Limit${titleScope(rule.scope)} osiągnięty`,
      body: `Wydatki ${period}: ${reached} przy limicie ${target}.`,
    };
  }

  const remaining = formatAmount(Math.max(alert.targetMinor - alert.amountMinor, 0), alert.currency);

  return {
    title: `Blisko limitu${titleScope(rule.scope)}`,
    body: `Wydatki ${period}: ${reached} z ${target}. Zostało ${remaining}.`,
  };
}
