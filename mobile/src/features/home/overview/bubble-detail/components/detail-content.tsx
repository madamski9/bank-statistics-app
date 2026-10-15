import { Platform, StyleSheet, Text, View } from 'react-native';

import { useCopy } from '@/features/app-shell/localization/language';
import { bubbleTints, overviewColors, type BubbleKey } from '@/features/app-shell/theme/overview-theme';
import { AmountText } from '@/features/settings/privacy/amounts/amount-text';
import { useAmountFormatting } from '@/features/settings/privacy/amounts/use-private-amounts';

import { periodOption, type SpendingPeriod } from '../../period/periods';
import { spendingOverviewCopy } from '../../spending-overview-copy';
import type { SpendingSource, SpendingSummary } from '../../spending/spending-summary';
import type { SpendingTrend } from '../../spending/spending-trend';
import { AreaChart, type AreaSeries } from '../area-chart/area-chart';
import { NetBreakdown } from './net-breakdown';
import { SourceRow } from './source-row';

function trendSeries(key: BubbleKey, trend: SpendingTrend, titles: Record<BubbleKey, string>): AreaSeries[] {
  const expense = { key: 'expense', label: titles.expense, color: bubbleTints.expense.film, values: trend.expense };
  const income = { key: 'income', label: titles.income, color: bubbleTints.income.film, values: trend.income };

  if (key === 'expense') {
    return [expense];
  }

  return key === 'income' ? [income] : [income, expense];
}

interface DetailContentProps {
  bubbleKey: BubbleKey;
  summary: SpendingSummary;
  trend: SpendingTrend;
  period: SpendingPeriod;
  onSelectSource: (source: SpendingSource) => void;
}

export function DetailContent({ bubbleKey, summary, trend, period, onSelectSource }: DetailContentProps) {
  const copy = useCopy(spendingOverviewCopy);
  const { formatAmount } = useAmountFormatting();
  const sources: SpendingSource[] = bubbleKey === 'income' ? summary.incomeSources : summary.sources;

  return (
    <>
      <View style={styles.trend}>
        <AreaChart
          formatValue={(minor) => formatAmount(minor, summary.currency)}
          points={trend.points}
          series={trendSeries(bubbleKey, trend, copy.titles)}
        />
      </View>
      {bubbleKey === 'net' ? (
        <NetBreakdown summary={summary} />
      ) : sources.length === 0 ? (
        <AmountText maxFontSizeMultiplier={1.6} style={styles.explainer}>
          {Platform.OS === 'ios'
            ? copy.noDataInPeriod(periodOption(period).label)
            : copy.captureIosOnly}
        </AmountText>
      ) : (
        sources.map((source) => (
          <SourceRow
            currency={summary.currency}
            isSelectable={bubbleKey === 'expense' && source.group !== null}
            key={source.key}
            onSelect={onSelectSource}
            source={source}
            tint={bubbleTints[bubbleKey].film}
          />
        ))
      )}

      {summary.accounts.length > 0 ? (
        <Text maxFontSizeMultiplier={1.6} style={styles.footnote}>
          {copy.dataFrom(summary.accounts.join(', '))}
        </Text>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  trend: {
    paddingBottom: 8,
  },
  explainer: {
    fontSize: 14,
    lineHeight: 20,
    color: overviewColors.textSecondary,
  },
  footnote: {
    fontSize: 12,
    lineHeight: 17,
    color: overviewColors.textSecondary,
  },
});
