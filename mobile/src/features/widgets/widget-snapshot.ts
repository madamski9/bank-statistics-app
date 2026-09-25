import type { IngestionRecord } from '@bankstats/ingestion-native';

import { alertProgress } from '@/features/alerts/alert-evaluation';
import { alertWindow } from '@/features/alerts/alert-period';
import type { AlertRule, AlertScope } from '@/features/alerts/alert-rule';
import type { CategorizationRule } from '@/features/classification/categorization-rule';
import { categoryLabel } from '@/features/classification/categories';
import { groupSpending } from '@/features/classification/spending-groups';
import { calendarCopy } from '@/features/localization/calendar-copy';
import { currentCopy } from '@/features/localization/language';
import { formatCompactAmount } from '@/features/spending-overview/formatting';
import type { PeriodWindow } from '@/features/spending-overview/periods';
import { summarizeSpending } from '@/features/spending-overview/spending-summary';
import { affectsStatistics } from '@/features/transactions/transaction-record';

import { widgetsCopy } from './widgets-copy';

export type WidgetLimitTone = 'calm' | 'caution' | 'over';

export interface WidgetLimit {
  name: string;
  spentLabel: string;
  targetLabel: string;
  remainingLabel: string;
  remainingAmountLabel: string;
  spentOfTargetLabel: string;
  share: number;
  tone: WidgetLimitTone;
  daysLeftLabel: string;
}

export interface WidgetShop {
  name: string;
  amountLabel: string;
  share: number;
}

export type WidgetLabels = {
  [Key in keyof (typeof widgetsCopy)['pl']['labels']]: string;
};

export interface SpendingWidgetProps {
  status: 'ready' | 'signedOut' | 'locked';
  monthKey: string;
  monthLabel: string;
  updatedAtMs: number;
  updatedLabel: string;
  expenseLabel: string;
  dailyLabel: string;
  dailyAmountLabel: string;
  incomeLabel: string;
  countLabel: string;
  limits: WidgetLimit[];
  shops: WidgetShop[];
  screen?: 'month' | 'watch' | 'limits' | 'shops';
  openUrl: string;
  isBlurred: boolean;
  revealUrl: string;
  labels: WidgetLabels;
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
}

const dayMs = 86_400_000;
const cautionShare = 0.8;
const maximumLimits = 4;
const maximumShops = 4;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function widgetMonthKey(reference: Date): string {
  return `${reference.getFullYear()}-${pad(reference.getMonth() + 1)}`;
}

function monthLabel(reference: Date): string {
  return currentCopy(calendarCopy).monthNames[reference.getMonth()];
}

export function widgetLabels(reference: Date): WidgetLabels {
  const { asOf, ...labels } = currentCopy(widgetsCopy).labels;

  return { ...labels, asOf: asOf(updatedLabel(reference)) };
}

function updatedLabel(reference: Date): string {
  const time = `${pad(reference.getHours())}:${pad(reference.getMinutes())}`;

  return currentCopy(widgetsCopy).updated(reference.getDate(), reference.getMonth(), time);
}

function scopeName(scope: AlertScope): string {
  if (scope.kind === 'all') {
    return currentCopy(widgetsCopy).allSpending;
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
    return currentCopy(widgetsCopy).lastDay;
  }

  return currentCopy(widgetsCopy).daysLeft(days);
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
      const copy = currentCopy(widgetsCopy);
      const spentLabel = formatCompactAmount(progress.amountMinor, progress.currency);
      const targetLabel = formatCompactAmount(progress.targetMinor, progress.currency);

      return {
        name: scopeName(rule.scope),
        spentLabel,
        targetLabel,
        remainingLabel:
          remainingMinor >= 0
            ? copy.remaining(formatCompactAmount(remainingMinor, progress.currency))
            : copy.overLimit(formatCompactAmount(remainingMinor, progress.currency)),
        remainingAmountLabel: formatCompactAmount(remainingMinor, progress.currency),
        spentOfTargetLabel: copy.spentOfTarget(spentLabel, targetLabel),
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
}: SnapshotSources): SpendingWidgetProps {
  const counted = records.filter(affectsStatistics);
  const month = alertWindow({ kind: 'month' }, reference);
  const window: PeriodWindow = { startMs: month.startMs, endMs: reference.getTime() };
  const summary = summarizeSpending(counted, window, categorizationRules);
  const elapsedDays = Math.max(Math.ceil((reference.getTime() - month.startMs) / dayMs), 1);
  const dailyAmountLabel = formatCompactAmount(
    Math.round(summary.expenseMinor / elapsedDays),
    summary.currency,
  );
  const copy = currentCopy(widgetsCopy);
  const shops = groupSpending(
    counted.filter((record) => record.currency === summary.currency),
    { window, rules: categorizationRules, dimension: 'merchant' },
  )
    .slice(0, maximumShops)
    .map((group) => ({
      name: group.name,
      amountLabel: formatCompactAmount(group.totalMinor, group.currency),
      share: group.share,
    }));

  return {
    status: 'ready',
    monthKey: widgetMonthKey(reference),
    monthLabel: monthLabel(reference),
    updatedAtMs: reference.getTime(),
    updatedLabel: updatedLabel(reference),
    expenseLabel: formatCompactAmount(summary.expenseMinor, summary.currency),
    dailyAmountLabel,
    dailyLabel: copy.perDay(dailyAmountLabel),
    incomeLabel: formatCompactAmount(summary.incomeMinor, summary.currency),
    countLabel: copy.payments(summary.expenseCount),
    limits: widgetLimits(alertRules, counted, categorizationRules, reference),
    shops,
    openUrl,
    isBlurred: false,
    revealUrl,
    labels: widgetLabels(reference),
  };
}

export function signedOutWidgetProps(reference: Date, openUrl: string): SpendingWidgetProps {
  return emptyWidgetProps('signedOut', reference, openUrl);
}

export function lockedWidgetProps(reference: Date, openUrl: string): SpendingWidgetProps {
  return emptyWidgetProps('locked', reference, openUrl);
}

function emptyWidgetProps(
  status: Exclude<SpendingWidgetProps['status'], 'ready'>,
  reference: Date,
  openUrl: string,
): SpendingWidgetProps {
  return {
    status,
    monthKey: widgetMonthKey(reference),
    monthLabel: monthLabel(reference),
    updatedAtMs: reference.getTime(),
    updatedLabel: updatedLabel(reference),
    expenseLabel: '',
    dailyLabel: '',
    dailyAmountLabel: '',
    incomeLabel: '',
    countLabel: '',
    limits: [],
    shops: [],
    openUrl,
    isBlurred: false,
    revealUrl: openUrl,
    labels: widgetLabels(reference),
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
