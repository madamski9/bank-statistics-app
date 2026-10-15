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

interface GroupAverageCardProps {
  summary: MonthlySummary;
  selectedDay: number | null;
  dayDate: (day: number) => string;
  onSelectDay: (day: number | null) => void;
}

export function GroupAverageCard({ summary, selectedDay, dayDate, onSelectDay }: GroupAverageCardProps) {
  const copy = useCopy(monthlySummaryCopy);
  const { formatAmount } = useAmountFormatting();
  const chartCategories = summary.dailyCategories.slice(0, 3).map((entry) => entry.name);

  if (summary.dailyCategories.length > 3) {
    chartCategories.push(copy.other);
  }

  return (
    <View style={styles.card}>
      <View style={styles.heroRow}>
        <View style={styles.hero}>
          <Text maxFontSizeMultiplier={1.4} style={styles.caption}>
            {copy.dailyAverage}
          </Text>
          <AmountText adjustsFontSizeToFit maxFontSizeMultiplier={1.3} numberOfLines={1} style={styles.amount}>
            {formatAmount(summary.dailyExpenseMinor, reportingCurrency)}
          </AmountText>
        </View>
        <AmountText
          maxFontSizeMultiplier={1.4}
          numberOfLines={2}
          style={[
            styles.change,
            summary.dailyExpenseChange === null
              ? null
              : { color: summary.dailyExpenseChange > 0 ? overviewColors.negative : overviewColors.positive },
          ]}
        >
          {summary.dailyExpenseChange === null
            ? copy.noPrevious
            : copy.versusPrevious(formatChange(summary.dailyExpenseChange), summary.dailyExpenseChange > 0)}
        </AmountText>
      </View>
      <DailySpendBars
        accessibilityLabel={copy.chartLabel(
          formatAmount(summary.dailyExpenseMinor, reportingCurrency),
          null,
          chartCategories,
        )}
        averageLabel={copy.average}
        averageMinor={summary.dailyExpenseMinor}
        dailyCategories={summary.dailyCategories}
        dailyExpensesMinor={summary.dailyExpensesMinor}
        barAccessibilityLabel={(day, totalMinor) =>
          copy.barLabel(dayDate(day), formatAmount(totalMinor, reportingCurrency))
        }
        elapsedDays={summary.elapsedDays}
        onSelectDay={onSelectDay}
        otherLabel={copy.other}
        selectedDay={selectedDay}
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
  card: {
    gap: overviewSpacing.block,
    padding: overviewSpacing.block,
    borderRadius: 20,
    backgroundColor: overviewColors.surfacePressed,
  },
  heroRow: { flexDirection: 'row', alignItems: 'flex-end', gap: overviewSpacing.tight },
  hero: { flex: 1, gap: 2 },
  caption: { fontSize: 13, lineHeight: 18, color: overviewColors.textSecondary },
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
