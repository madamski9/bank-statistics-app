import { useMemo } from 'react';

import type { IngestionRecord } from '@bankstats/ingestion-native';

import type { CategorizationRule } from '@/features/data/classification/categorization-rule';
import { groupSpending, type SpendingDimension } from '@/features/data/classification/spending-groups';
import { periodWindow, previousPeriodWindow, type SpendingPeriod } from '@/features/home/overview/period/periods';
import { periodChange, summarizeSpending } from '@/features/home/overview/spending/spending-summary';
import { spendingTrend } from '@/features/home/overview/spending/spending-trend';

interface SpendingNumbersOptions {
  records: IngestionRecord[];
  countedRecords: IngestionRecord[];
  rules: CategorizationRule[];
  period: SpendingPeriod;
  dimension: SpendingDimension;
}

export function useSpendingNumbers({ records, countedRecords, rules, period, dimension }: SpendingNumbersOptions) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const spendWindow = useMemo(() => periodWindow(period, new Date()), [period, records]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const previousWindow = useMemo(() => previousPeriodWindow(period, new Date()), [period, records]);
  const summary = useMemo(
    () => summarizeSpending(countedRecords, spendWindow, rules),
    [countedRecords, rules, spendWindow],
  );
  const trend = useMemo(
    () => spendingTrend(countedRecords, summary.currency, spendWindow, period),
    [countedRecords, period, spendWindow, summary.currency],
  );
  const previousSummary = useMemo(
    () =>
      previousWindow === null
        ? null
        : summarizeSpending(countedRecords, previousWindow, rules),
    [countedRecords, previousWindow, rules],
  );
  const groups = useMemo(
    () => groupSpending(countedRecords, { window: spendWindow, rules, dimension }),
    [countedRecords, dimension, rules, spendWindow],
  );
  const expenseChange =
    previousSummary === null
      ? null
      : periodChange(summary.expenseMinor, previousSummary.expenseMinor);

  return { spendWindow, summary, previousSummary, trend, groups, expenseChange };
}
