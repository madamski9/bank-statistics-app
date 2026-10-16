import { useMemo } from 'react';

import type { IngestionRecord } from '@bankstats/ingestion-native';

import type { CategorizationRule } from '@/features/data/classification/categorization-rule';
import type { PeriodWindow } from '@/features/home/overview/period/periods';
import type { AlertRule } from '@/features/insights/alerts/rules/alert-rule';
import { monthForecast } from '@/features/insights/forecast/month-forecast';
import { monthOf, shiftMonth } from '@/features/insights/monthly-summary/monthly-summary';
import {
  detectRecurringPayments,
  monthlyRecurringCost,
  recurringCandidates,
} from '@/features/insights/subscriptions/recurring-payments';
import { useDismissedSubscriptions } from '@/features/insights/subscriptions/use-dismissed-subscriptions';
import { useTrackedSubscriptions } from '@/features/insights/subscriptions/use-tracked-subscriptions';

interface OverviewInsightsOptions {
  countedRecords: IngestionRecord[];
  rules: CategorizationRule[];
  spendWindow: PeriodWindow;
  alertRules: AlertRule[];
  showsCandidates: boolean;
}

export function useOverviewInsights({
  countedRecords,
  rules,
  spendWindow,
  alertRules,
  showsCandidates,
}: OverviewInsightsOptions) {
  const dismissedSubscriptions = useDismissedSubscriptions();
  const trackedSubscriptions = useTrackedSubscriptions();
  const insightsNow = useMemo(() => new Date(spendWindow.endMs), [spendWindow.endMs]);
  const recurringPayments = useMemo(
    () =>
      detectRecurringPayments(
        countedRecords,
        rules,
        insightsNow,
        dismissedSubscriptions.dismissed,
        trackedSubscriptions.tracked,
      ),
    [countedRecords, dismissedSubscriptions.dismissed, insightsNow, rules, trackedSubscriptions.tracked],
  );
  const recurringPaymentCandidates = useMemo(
    () =>
      showsCandidates
        ? recurringCandidates(
            countedRecords,
            rules,
            insightsNow,
            recurringPayments,
          )
        : [],
    [countedRecords, insightsNow, recurringPayments, rules, showsCandidates],
  );
  const monthlyLimitTarget = useMemo(
    () =>
      alertRules.find(
        (rule) =>
          rule.isActive &&
          rule.metric === 'expense' &&
          rule.condition === 'threshold' &&
          rule.scope.kind === 'all' &&
          rule.period.kind === 'month',
      )?.targetMinor ?? null,
    [alertRules],
  );
  const forecast = useMemo(
    () => monthForecast(countedRecords, recurringPayments, insightsNow, monthlyLimitTarget),
    [countedRecords, insightsNow, monthlyLimitTarget, recurringPayments],
  );
  const recurringMonthlyMinor = useMemo(() => monthlyRecurringCost(recurringPayments), [recurringPayments]);
  const recurringCount = useMemo(
    () => recurringPayments.filter((payment) => payment.isActive).length,
    [recurringPayments],
  );
  const reportMonth = shiftMonth(monthOf(insightsNow), -1).month;

  return {
    dismissedSubscriptions,
    trackedSubscriptions,
    recurringPayments,
    recurringPaymentCandidates,
    recurringMonthlyMinor,
    recurringCount,
    forecast,
    reportMonth,
  };
}

export type OverviewInsights = ReturnType<typeof useOverviewInsights>;
