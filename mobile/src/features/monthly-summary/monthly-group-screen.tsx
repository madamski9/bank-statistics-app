import type { IngestionRecord } from '@bankstats/ingestion-native';
import { SymbolView } from 'expo-symbols';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { CategorizationRule } from '@/features/classification/categorization-rule';
import { reportingCurrency } from '@/features/currency-conversion/exchange-rate';
import { calendarCopy } from '@/features/localization/calendar-copy';
import { useCopy } from '@/features/localization/language';
import { useAmountFormatting } from '@/features/privacy/use-private-amounts';
import { SheetLayout } from '@/features/app-shell/sheet-layout';
import { formatChange, formatShare, formatTransactionCount } from '@/features/spending-overview/formatting';
import { overviewColors, overviewSpacing } from '@/features/spending-overview/overview-theme';
import { selectionChanged } from '@/haptics';

import { DailySpendBars } from './daily-spend-bars';
import { MonthComparisonChart } from './month-comparison';
import { compareMonths, recordsForSummaryGroup, summarizeMonth, type SummaryMonth } from './monthly-summary';
import { monthlySummaryCopy } from './monthly-summary-copy';

export interface SummaryGroupSelection {
  dimension: 'merchant' | 'category';
  key: string;
  name: string;
}

interface MonthlyGroupScreenProps {
  records: IngestionRecord[];
  rules: CategorizationRule[];
  month: SummaryMonth;
  now: Date;
  monthExpenseMinor: number;
  group: SummaryGroupSelection;
  onBack: () => void;
  onClose: () => void;
}

export function MonthlyGroupScreen({
  records,
  rules,
  month,
  now,
  monthExpenseMinor,
  group,
  onBack,
  onClose,
}: MonthlyGroupScreenProps) {
  const copy = useCopy(monthlySummaryCopy);
  const calendar = useCopy(calendarCopy);
  const { formatAmount } = useAmountFormatting();
  const groupRecords = useMemo(
    () => recordsForSummaryGroup(records, month, rules, group.dimension, group.key),
    [group.dimension, group.key, month, records, rules],
  );
  const summary = useMemo(
    () => summarizeMonth(groupRecords, month, { rules, events: [], recurring: [], now }),
    [groupRecords, month, now, rules],
  );
  const comparedMonths = useMemo(() => compareMonths(groupRecords, month, now), [groupRecords, month, now]);
  const chartCategories = summary.dailyCategories.slice(0, 3).map((entry) => entry.name);

  if (summary.dailyCategories.length > 3) {
    chartCategories.push(copy.other);
  }

  return (
    <SheetLayout
      closeLabel={copy.done}
      leading={
        <Pressable
          accessibilityLabel={copy.backToReport}
          accessibilityRole="button"
          onPress={() => {
            selectionChanged();
            onBack();
          }}
          style={({ pressed }) => [styles.backButton, pressed ? styles.pressed : null]}
        >
          <SymbolView
            name={{ ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }}
            size={18}
            tintColor={overviewColors.textPrimary}
          />
        </Pressable>
      }
      onClose={onClose}
      title={group.name}
    >
      <View style={styles.intro}>
        <Text maxFontSizeMultiplier={1.4} style={styles.caption}>
          {group.dimension === 'merchant' ? copy.store : copy.category} · {calendar.monthNames[month.month]} {month.year}
        </Text>
        <Text maxFontSizeMultiplier={1.4} style={styles.caption}>
          {copy.groupDetail(
            copy.payments(summary.expenseCount),
            formatShare(monthExpenseMinor === 0 ? 0 : summary.expenseMinor / monthExpenseMinor),
          )}
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.heroRow}>
          <View style={styles.hero}>
            <Text maxFontSizeMultiplier={1.4} style={styles.caption}>
              {copy.dailyAverage}
            </Text>
            <Text adjustsFontSizeToFit maxFontSizeMultiplier={1.3} numberOfLines={1} style={styles.amount}>
              {formatAmount(summary.dailyExpenseMinor, reportingCurrency)}
            </Text>
          </View>
          <Text
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
          </Text>
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
          elapsedDays={summary.elapsedDays}
          otherLabel={copy.other}
        />
        <Text maxFontSizeMultiplier={1.4} style={styles.cardTotal}>
          {copy.total(
            formatAmount(summary.expenseMinor, reportingCurrency),
            formatTransactionCount(summary.expenseCount),
          )}
        </Text>
      </View>

      <View style={styles.section}>
        <Text maxFontSizeMultiplier={1.4} style={styles.sectionLabel}>
          {copy.monthComparison.toLocaleUpperCase()}
        </Text>
        <Text maxFontSizeMultiplier={1.4} style={styles.caption}>
          {copy.groupMonthComparisonDetail}
        </Text>
        <MonthComparisonChart months={comparedMonths} />
      </View>
    </SheetLayout>
  );
}

const styles = StyleSheet.create({
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: overviewColors.surfacePressed,
  },
  intro: { gap: 4 },
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
  section: { gap: overviewSpacing.tight },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.6,
    color: overviewColors.textSecondary,
  },
  pressed: { opacity: 0.6 },
});
