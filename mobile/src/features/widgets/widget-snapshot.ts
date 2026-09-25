import type { IngestionRecord } from '@bankstats/ingestion-native';

import { alertProgress } from '@/features/alerts/alert-evaluation';
import { alertWindow } from '@/features/alerts/alert-period';
import type { AlertRule, AlertScope } from '@/features/alerts/alert-rule';
import type { CategorizationRule } from '@/features/classification/categorization-rule';
import { categoryLabel } from '@/features/classification/categories';
import { groupSpending } from '@/features/classification/spending-groups';
import { formatCompactAmount } from '@/features/spending-overview/formatting';
import type { PeriodWindow } from '@/features/spending-overview/periods';
import { summarizeSpending } from '@/features/spending-overview/spending-summary';
import { affectsStatistics } from '@/features/transactions/transaction-record';

export type WidgetLimitTone = 'calm' | 'caution' | 'over';

export interface WidgetLimit {
  name: string;
  spentLabel: string;
  targetLabel: string;
  remainingLabel: string;
  share: number;
  tone: WidgetLimitTone;
  daysLeftLabel: string;
}

export interface WidgetShop {
  name: string;
  amountLabel: string;
  share: number;
}

export interface SpendingWidgetProps {
  status: 'ready' | 'signedOut';
  monthKey: string;
  monthLabel: string;
  updatedAtMs: number;
  updatedLabel: string;
  expenseLabel: string;
  dailyLabel: string;
  countLabel: string;
  limits: WidgetLimit[];
  shops: WidgetShop[];
  step: number;
  openUrl: string;
  isBlurred: boolean;
  revealUrl: string;
}

export interface WidgetPrivacy {
  isBlurred: boolean;
  revealedUntilMs: number;
}

export interface SpendingWidgetEntry {
  date: Date;
  props: SpendingWidgetProps;
}

export interface SnapshotSources {
  records: IngestionRecord[];
  alertRules: AlertRule[];
  categorizationRules: CategorizationRule[];
  reference: Date;
  openUrl: string;
  revealUrl?: string;
  step?: number;
}

const dayMs = 86_400_000;
const cautionShare = 0.8;
const maximumLimits = 4;
const maximumShops = 4;

const monthNames = [
  'Styczeń',
  'Luty',
  'Marzec',
  'Kwiecień',
  'Maj',
  'Czerwiec',
  'Lipiec',
  'Sierpień',
  'Wrzesień',
  'Październik',
  'Listopad',
  'Grudzień',
];

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function widgetMonthKey(reference: Date): string {
  return `${reference.getFullYear()}-${pad(reference.getMonth() + 1)}`;
}

function updatedLabel(reference: Date): string {
  return `${reference.getDate()}.${pad(reference.getMonth() + 1)}, ${pad(reference.getHours())}:${pad(reference.getMinutes())}`;
}

function scopeName(scope: AlertScope): string {
  if (scope.kind === 'all') {
    return 'Wszystkie wydatki';
  }

  if (scope.kind === 'category') {
    return categoryLabel(scope.id);
  }

  return scope.name;
}

function limitTone(share: number): WidgetLimitTone {
  if (share >= 1) {
    return 'over';
  }

  return share >= cautionShare ? 'caution' : 'calm';
}

function daysLeftLabel(endMs: number, reference: Date): string {
  const days = Math.max(Math.ceil((endMs - reference.getTime()) / dayMs), 0);

  if (days === 0) {
    return 'ostatni dzień';
  }

  return days === 1 ? 'jeszcze 1 dzień' : `jeszcze ${days} dni`;
}

function transactionCountLabel(count: number): string {
  return count === 1 ? '1 płatność' : `${count} płatności`;
}

function isSpendingLimit(rule: AlertRule): boolean {
  return (
    rule.isActive &&
    rule.condition === 'threshold' &&
    rule.metric === 'expense' &&
    rule.targetMinor > 0
  );
}

export function widgetLimits(
  alertRules: AlertRule[],
  records: IngestionRecord[],
  categorizationRules: CategorizationRule[],
  reference: Date,
): WidgetLimit[] {
  return alertRules
    .filter(isSpendingLimit)
    .map((rule) => {
      const progress = alertProgress(rule, records, { reference, rules: categorizationRules });
      const remainingMinor = progress.targetMinor - progress.amountMinor;

      return {
        name: scopeName(rule.scope),
        spentLabel: formatCompactAmount(progress.amountMinor, progress.currency),
        targetLabel: formatCompactAmount(progress.targetMinor, progress.currency),
        remainingLabel:
          remainingMinor >= 0
            ? `zostało ${formatCompactAmount(remainingMinor, progress.currency)}`
            : `${formatCompactAmount(remainingMinor, progress.currency)} ponad limit`,
        share: progress.share,
        tone: limitTone(progress.share),
        daysLeftLabel: daysLeftLabel(progress.window.endMs, reference),
      };
    })
    .sort((left, right) => right.share - left.share)
    .slice(0, maximumLimits);
}

export function buildSpendingWidgetProps({
  records,
  alertRules,
  categorizationRules,
  reference,
  openUrl,
  revealUrl = openUrl,
  step = 0,
}: SnapshotSources): SpendingWidgetProps {
  const counted = records.filter(affectsStatistics);
  const month = alertWindow({ kind: 'month' }, reference);
  const window: PeriodWindow = { startMs: month.startMs, endMs: reference.getTime() };
  const summary = summarizeSpending(counted, window, categorizationRules);
  const elapsedDays = Math.max(Math.ceil((reference.getTime() - month.startMs) / dayMs), 1);
  const shops = groupSpending(counted, { window, rules: categorizationRules, dimension: 'merchant' })
    .slice(0, maximumShops)
    .map((group) => ({
      name: group.name,
      amountLabel: formatCompactAmount(group.totalMinor, group.currency),
      share: group.share,
    }));

  return {
    status: 'ready',
    monthKey: widgetMonthKey(reference),
    monthLabel: monthNames[reference.getMonth()],
    updatedAtMs: reference.getTime(),
    updatedLabel: updatedLabel(reference),
    expenseLabel: formatCompactAmount(summary.expenseMinor, summary.currency),
    dailyLabel: `${formatCompactAmount(Math.round(summary.expenseMinor / elapsedDays), summary.currency)} dziennie`,
    countLabel: transactionCountLabel(summary.expenseCount),
    limits: widgetLimits(alertRules, counted, categorizationRules, reference),
    shops,
    step,
    openUrl,
    isBlurred: false,
    revealUrl,
  };
}

export function signedOutWidgetProps(reference: Date, openUrl: string): SpendingWidgetProps {
  return {
    status: 'signedOut',
    monthKey: widgetMonthKey(reference),
    monthLabel: monthNames[reference.getMonth()],
    updatedAtMs: reference.getTime(),
    updatedLabel: updatedLabel(reference),
    expenseLabel: '',
    dailyLabel: '',
    countLabel: '',
    limits: [],
    shops: [],
    step: 0,
    openUrl,
    isBlurred: false,
    revealUrl: openUrl,
  };
}

export function widgetEntries(
  props: SpendingWidgetProps,
  privacy: WidgetPrivacy,
  now: Date,
): SpendingWidgetEntry[] {
  if (!privacy.isBlurred || props.status !== 'ready') {
    return [{ date: now, props: { ...props, isBlurred: false } }];
  }

  if (privacy.revealedUntilMs > now.getTime()) {
    return [
      { date: now, props: { ...props, isBlurred: false } },
      { date: new Date(privacy.revealedUntilMs), props: { ...props, isBlurred: true } },
    ];
  }

  return [{ date: now, props: { ...props, isBlurred: true } }];
}
