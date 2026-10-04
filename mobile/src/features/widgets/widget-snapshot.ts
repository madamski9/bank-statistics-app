import type { IngestionRecord } from '@bankstats/ingestion-native';

import { alertProgress } from '@/features/alerts/alert-evaluation';
import type { AlertRule, AlertScope } from '@/features/alerts/alert-rule';
import type { CategorizationRule } from '@/features/classification/categorization-rule';
import { categoryLabel } from '@/features/classification/categories';
import { groupSpending } from '@/features/classification/spending-groups';
import { currentCopy } from '@/features/localization/language';
import { expenseRhythm, rhythmAverageMinor } from '@/features/overview/spending-rhythm';
import { formatAmount, formatCompactAmount } from '@/features/spending-overview/formatting';
import { periodWindow, type SpendingPeriod } from '@/features/spending-overview/periods';
import { summarizeSpending } from '@/features/spending-overview/spending-summary';
import { statisticalRecords } from '@/features/transactions/transaction-record';

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
  periodLabel: string;
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
  updatedAt?: Date;
  openUrl: string;
  revealUrl?: string;
}

const dayMs = 86_400_000;
const cautionShare = 0.8;
const maximumLimits = 4;
const maximumShops = 4;
const widgetPeriod: SpendingPeriod = 'month';
const refreshDays = 7;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function periodLabel(): string {
  return currentCopy(widgetsCopy).periodShort;
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
  updatedAt = reference,
  openUrl,
  revealUrl = openUrl,
}: SnapshotSources): SpendingWidgetProps {
  const counted = statisticalRecords(records);
  const window = periodWindow(widgetPeriod, reference);
  const summary = summarizeSpending(counted, window, categorizationRules);
  const rhythm = expenseRhythm(counted, summary.currency, window, widgetPeriod);
  const dailyAmountLabel = formatCompactAmount(rhythmAverageMinor(rhythm.buckets), summary.currency);
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
    periodLabel: periodLabel(),
    updatedAtMs: updatedAt.getTime(),
    updatedLabel: updatedLabel(updatedAt),
    expenseLabel: formatAmount(summary.expenseMinor, summary.currency),
    dailyAmountLabel,
    dailyLabel: copy.perDay(dailyAmountLabel),
    incomeLabel: formatCompactAmount(summary.incomeMinor, summary.currency),
    countLabel: copy.payments(summary.expenseCount),
    limits: widgetLimits(alertRules, counted, categorizationRules, reference),
    shops,
    openUrl,
    isBlurred: false,
    revealUrl,
    labels: widgetLabels(updatedAt),
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
    periodLabel: periodLabel(),
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

export function widgetRefreshMoments(now: Date, privacy: WidgetPrivacy): Date[] {
  const moments = [now.getTime()];

  for (let day = 1; day <= refreshDays; day += 1) {
    moments.push(new Date(now.getFullYear(), now.getMonth(), now.getDate() + day).getTime());
  }

  if (privacy.isBlurred && privacy.revealedUntilMs > now.getTime()) {
    moments.push(privacy.revealedUntilMs);
  }

  return [...new Set(moments)].sort((left, right) => left - right).map((moment) => new Date(moment));
}

export function widgetEntries(
  propsAt: (moment: Date) => SpendingWidgetProps,
  privacy: WidgetPrivacy,
  now: Date,
): SpendingWidgetEntry[] {
  return widgetRefreshMoments(now, privacy).map((date) => {
    const props = propsAt(date);
    const isBlurred =
      privacy.isBlurred && props.status === 'ready' && privacy.revealedUntilMs <= date.getTime();

    return { date, props: { ...props, isBlurred } };
  });
}
