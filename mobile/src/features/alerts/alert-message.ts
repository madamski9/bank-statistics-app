import { categoryLabel } from '@/features/classification/categories';
import { formatAmount } from '@/features/spending-overview/formatting';

import type { RaisedAlert } from './alert-delivery';
import type { AlertPeriod } from './alert-period';
import type { AlertMetric, AlertRule, AlertScope } from './alert-rule';

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

const metricNouns: Record<AlertMetric, string> = {
  expense: 'Wydatki',
  income: 'Przychody',
  netFlow: 'Bilans',
};

const metricSubjects: Record<AlertMetric, string> = {
  expense: 'limitu',
  income: 'celu przychodów',
  netFlow: 'progu bilansu',
};

const metricSubjectsReached: Record<AlertMetric, string> = {
  expense: 'Limit',
  income: 'Cel przychodów',
  netFlow: 'Próg bilansu',
};

function titleScope(scope: AlertScope, metric: AlertMetric): string {
  if (scope.kind === 'merchant') {
    return ` w ${scope.name}`;
  }

  if (scope.kind === 'counterparty') {
    return ` dla ${scope.name}`;
  }

  if (scope.kind === 'category') {
    return ` w kategorii ${categoryLabel(scope.id)}`;
  }

  return metric === 'expense' ? ' wydatków' : '';
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

  const noun = metricNouns[rule.metric];
  const boundary = rule.metric === 'expense' ? 'limicie' : 'progu';

  if (alert.share >= 1) {
    return {
      title: `${metricSubjectsReached[rule.metric]}${titleScope(rule.scope, rule.metric)} osiągnięty`,
      body: `${noun} ${period}: ${reached} przy ${boundary} ${target}.`,
    };
  }

  const remaining = formatAmount(Math.max(alert.targetMinor - alert.amountMinor, 0), alert.currency);

  return {
    title: `Blisko ${metricSubjects[rule.metric]}${titleScope(rule.scope, rule.metric)}`,
    body: `${noun} ${period}: ${reached} z ${target}. Zostało ${remaining}.`,
  };
}
