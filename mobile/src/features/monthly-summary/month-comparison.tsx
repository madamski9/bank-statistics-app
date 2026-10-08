import { StyleSheet, View } from 'react-native';

import { reportingCurrency } from '@/features/currency-conversion/exchange-rate';
import { calendarCopy } from '@/features/localization/calendar-copy';
import { useCopy } from '@/features/localization/language';
import { AmountText } from '@/features/privacy/amount-text';
import { useAmountFormatting } from '@/features/privacy/use-private-amounts';
import { bubbleTints, overviewColors, overviewSpacing } from '@/features/spending-overview/overview-theme';

import { GrowingFill } from './growing-fill';
import type { MonthComparison } from './monthly-summary';

interface MonthComparisonChartProps {
  months: MonthComparison[];
  isActive?: boolean;
}

export function MonthComparisonChart({ months, isActive = true }: MonthComparisonChartProps) {
  const calendar = useCopy(calendarCopy);
  const { formatCompactAmount } = useAmountFormatting();
  const maximum = Math.max(...months.map((month) => month.dailyAverageMinor), 1);

  return (
    <View style={styles.card}>
      {months.map((entry, index) => {
        const label = `${calendar.shortMonths[entry.month.month] ?? ''} ${String(entry.month.year).slice(-2)}`;
        const value = formatCompactAmount(entry.dailyAverageMinor, reportingCurrency);
        const isSelected = index === months.length - 1;

        return (
          <View accessibilityLabel={`${label}, ${value}`} accessible key={`${entry.month.year}-${entry.month.month}`} style={styles.row}>
            <AmountText maxFontSizeMultiplier={1.3} style={[styles.month, isSelected ? styles.monthSelected : null]}>
              {label}
            </AmountText>
            <View style={styles.track}>
              {entry.dailyAverageMinor > 0 ? (
                <GrowingFill
                  color={isSelected ? bubbleTints.expense.film : bubbleTints.net.film}
                  delayMs={index * 45}
                  fraction={Math.max(entry.dailyAverageMinor / maximum, 0.02)}
                  isActive={isActive}
                  style={styles.fill}
                />
              ) : null}
            </View>
            <AmountText maxFontSizeMultiplier={1.2} numberOfLines={1} style={[styles.value, isSelected ? styles.valueSelected : null]}>
              {value}
            </AmountText>
          </View>
        );
      })}
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
  row: { minHeight: 24, flexDirection: 'row', alignItems: 'center', gap: overviewSpacing.row },
  month: { width: 46, fontSize: 12, fontWeight: '600', color: overviewColors.textSecondary },
  monthSelected: { color: overviewColors.textPrimary },
  track: { flex: 1, height: 8, borderRadius: 4, backgroundColor: overviewColors.textDisabled, overflow: 'hidden' },
  fill: { borderRadius: 4 },
  value: { width: 76, textAlign: 'right', fontSize: 12, color: overviewColors.textSecondary, fontVariant: ['tabular-nums'] },
  valueSelected: { color: overviewColors.textPrimary, fontWeight: '700' },
});
