import { StyleSheet, Text, View } from 'react-native';

import { formatChange, formatTransactionCount } from '@/features/app-shell/formatting/formatting';
import { useCopy } from '@/features/app-shell/localization/language';
import { overviewColors, overviewSpacing } from '@/features/app-shell/theme/overview-theme';
import { reportingCurrency } from '@/features/data/currency-conversion/exchange-rate';
import { AmountText } from '@/features/settings/privacy/amounts/amount-text';
import { useAmountFormatting } from '@/features/settings/privacy/amounts/use-private-amounts';

import { DailySpendBars } from '../../charts/daily-spend-bars';
import type { MonthlySummary } from '../../monthly-summary';
import { monthlySummaryCopy } from '../../monthly-summary-copy';
import { summaryStyles } from './summary-styles';

interface DailyAverageCardProps {
  summary: MonthlySummary;
  busiestLabel: string | null;
  isActive: boolean;
}

export function DailyAverageCard({ summary, busiestLabel, isActive }: DailyAverageCardProps) {
  const copy = useCopy(monthlySummaryCopy);
  const { formatAmount } = useAmountFormatting();
  const change = summary.dailyExpenseChange;
  const chartCategories = summary.dailyCategories.slice(0, 3).map((group) => group.name);

  if (summary.dailyCategories.length > 3) {
    chartCategories.push(copy.other);
  }

  return (
    <View style={styles.card}>
      <View style={styles.heroRow}>
        <View style={styles.hero}>
          <View style={styles.averageCaption}>
            <View style={styles.averageSwatch} />
            <Text maxFontSizeMultiplier={1.4} style={[summaryStyles.caption, styles.averageCaptionText]}>
              {copy.dailyAverage}
            </Text>
          </View>
          <AmountText adjustsFontSizeToFit maxFontSizeMultiplier={1.3} numberOfLines={1} style={styles.amount}>
            {formatAmount(summary.dailyExpenseMinor, reportingCurrency)}
          </AmountText>
        </View>
        {change !== null ? (
          <AmountText
            maxFontSizeMultiplier={1.4}
            numberOfLines={2}
            style={[styles.change, { color: change > 0 ? overviewColors.negative : overviewColors.positive }]}
          >
            {copy.versusPrevious(formatChange(change), change > 0)}
          </AmountText>
        ) : (
          <Text maxFontSizeMultiplier={1.4} style={styles.change}>
            {copy.noPrevious}
          </Text>
        )}
      </View>
      <DailySpendBars
        accessibilityLabel={copy.chartLabel(
          formatAmount(summary.dailyExpenseMinor, reportingCurrency),
          busiestLabel,
          chartCategories,
        )}
        averageLabel={copy.average}
        averageMinor={summary.dailyExpenseMinor}
        dailyCategories={summary.dailyCategories}
        dailyExpensesMinor={summary.dailyExpensesMinor}
        elapsedDays={summary.elapsedDays}
        isActive={isActive}
        otherLabel={copy.other}
      />
      <AmountText maxFontSizeMultiplier={1.4} style={styles.cardTotal}>
        {copy.total(
          formatAmount(summary.expenseMinor, reportingCurrency),
          formatTransactionCount(summary.expenseCount),
        )}
      </AmountText>
    </View>
  );
}

const styles = StyleSheet.create({
  averageCaption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  averageSwatch: {
    width: 14,
    borderTopWidth: 2,
    borderStyle: 'dashed',
    borderColor: overviewColors.positive,
  },
  averageCaptionText: {
    fontWeight: '600',
    color: overviewColors.positive,
  },
  card: {
    gap: overviewSpacing.block,
    padding: overviewSpacing.block,
    borderRadius: 20,
    backgroundColor: overviewColors.surfacePressed,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: overviewSpacing.tight,
  },
  hero: {
    flex: 1,
    gap: 2,
  },
  amount: {
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -1,
    color: overviewColors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  change: {
    flexShrink: 1,
    maxWidth: 132,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '600',
    color: overviewColors.textSecondary,
  },
  cardTotal: {
    paddingTop: overviewSpacing.row,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: overviewColors.hairline,
    fontSize: 13,
    lineHeight: 18,
    color: overviewColors.textSecondary,
  },
});
