import type { IngestionRecord } from '@bankstats/ingestion-native';
import { SymbolView } from 'expo-symbols';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { CategorizationRule } from '@/features/classification/categorization-rule';
import type { SpendingGroup } from '@/features/classification/spending-groups';
import { reportingCurrency } from '@/features/currency-conversion/exchange-rate';
import type { SpendingEvent } from '@/features/events/spending-event';
import { calendarCopy } from '@/features/localization/calendar-copy';
import { useCopy, useLanguage } from '@/features/localization/language';
import { useAmountFormatting } from '@/features/privacy/use-private-amounts';
import { SheetLayout, SheetRow, SheetSection, SheetSwitchRow } from '@/features/sheets/sheet-layout';
import {
  formatChange,
  formatShare,
  formatTransactionCount,
} from '@/features/spending-overview/formatting';
import { bubbleTints, overviewColors, overviewSpacing } from '@/features/spending-overview/overview-theme';
import type { RecurringPayment } from '@/features/subscriptions/recurring-payments';
import { transactionTitle } from '@/features/transactions/transaction-record';
import { selectionChanged } from '@/haptics';

import { DailySpendBars } from './daily-spend-bars';
import {
  monthKey,
  parseMonthKey,
  summarizeMonth,
  summaryMonths,
  type SummaryMonth,
} from './monthly-summary';
import { monthlySummaryCopy } from './monthly-summary-copy';
import type { MonthlySummaryReminder } from './use-monthly-summary-reminder';

interface MonthlySummaryScreenProps {
  records: IngestionRecord[];
  rules: CategorizationRule[];
  events: SpendingEvent[];
  recurring: RecurringPayment[];
  initialMonth?: string | null;
  reminder: MonthlySummaryReminder;
  onClose: () => void;
}

interface ShareRowProps {
  group: SpendingGroup;
  fraction: number;
  value: string;
  detail: string;
  tint: string;
}

function ShareRow({ group, fraction, value, detail, tint }: ShareRowProps) {
  return (
    <View accessibilityLabel={`${group.name}, ${value}, ${detail}`} accessible style={styles.shareRow}>
      <View style={styles.shareHeading}>
        <Text maxFontSizeMultiplier={1.4} numberOfLines={1} style={styles.shareName}>
          {group.name}
        </Text>
        <Text maxFontSizeMultiplier={1.4} style={styles.shareValue}>
          {value}
        </Text>
      </View>
      <View style={styles.shareTrack}>
        <View style={[styles.shareFill, { width: `${Math.max(fraction * 100, 2)}%`, backgroundColor: tint }]} />
      </View>
      <Text maxFontSizeMultiplier={1.4} style={styles.shareDetail}>
        {detail}
      </Text>
    </View>
  );
}

interface HighlightProps {
  label: string;
  value: string;
  detail?: string;
}

function Highlight({ label, value, detail }: HighlightProps) {
  return (
    <View
      accessibilityLabel={`${label}: ${value}${detail === undefined ? '' : `, ${detail}`}`}
      accessible
      style={styles.highlight}
    >
      <Text maxFontSizeMultiplier={1.4} numberOfLines={1} style={styles.highlightLabel}>
        {label}
      </Text>
      <Text adjustsFontSizeToFit maxFontSizeMultiplier={1.3} numberOfLines={1} style={styles.highlightValue}>
        {value}
      </Text>
      {detail !== undefined ? (
        <Text maxFontSizeMultiplier={1.4} numberOfLines={1} style={styles.highlightDetail}>
          {detail}
        </Text>
      ) : null}
    </View>
  );
}

export function MonthlySummaryScreen({
  records,
  rules,
  events,
  recurring,
  initialMonth = null,
  reminder,
  onClose,
}: MonthlySummaryScreenProps) {
  const copy = useCopy(monthlySummaryCopy);
  const calendar = useCopy(calendarCopy);
  const language = useLanguage();
  const { formatAmount, formatCompactAmount, formatSignedAmount } = useAmountFormatting();
  const now = useMemo(() => new Date(), []);
  const months = useMemo(() => summaryMonths(records, now), [now, records]);
  const [selectedKey, setSelectedKey] = useState(() => {
    const requested = initialMonth === null ? null : parseMonthKey(initialMonth);
    const fallback = months[1] ?? months[0];

    return monthKey(requested ?? fallback ?? { year: now.getFullYear(), month: now.getMonth() });
  });
  const index = Math.max(
    months.findIndex((month) => monthKey(month) === selectedKey),
    0,
  );
  const month: SummaryMonth = useMemo(
    () => months[index] ?? { year: now.getFullYear(), month: now.getMonth() },
    [index, months, now],
  );
  const summary = useMemo(
    () => summarizeMonth(records, month, { rules, events, recurring, now }),
    [events, month, now, records, recurring, rules],
  );
  const title = `${calendar.monthNames[month.month] ?? ''} ${month.year}`;
  const isEmpty = summary.expenseCount + summary.incomeCount === 0;
  const dayLabel = (day: number) => calendar.dayMonth(day, calendar.monthsInGenitive[month.month] ?? '');
  const busiestLabel = summary.busiestDay === null ? null : dayLabel(summary.busiestDay.day);
  const topCategoryMinor = summary.categories[0]?.totalMinor ?? 0;
  const topMerchantCount = summary.merchants[0]?.count ?? 0;
  const perDayCount = summary.transactionsPerDay.toFixed(1).replace('.', language === 'pl' ? ',' : '.');
  const change = summary.dailyExpenseChange;

  const move = (delta: number) => {
    const next = months[index + delta];

    if (next !== undefined) {
      selectionChanged();
      setSelectedKey(monthKey(next));
    }
  };

  return (
    <SheetLayout closeLabel={copy.done} onClose={onClose} title={copy.title}>
      <View style={styles.monthRow}>
        <Pressable
          accessibilityLabel={copy.previousMonth}
          accessibilityRole="button"
          disabled={index >= months.length - 1}
          hitSlop={8}
          onPress={() => move(1)}
          style={({ pressed }) => [
            styles.monthArrow,
            index >= months.length - 1 ? styles.hidden : null,
            pressed ? styles.pressed : null,
          ]}
        >
          <SymbolView
            name={{ ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }}
            size={17}
            tintColor={overviewColors.textPrimary}
          />
        </Pressable>
        <View style={styles.monthTitle}>
          <Text accessibilityRole="header" maxFontSizeMultiplier={1.3} style={styles.monthName}>
            {title}
          </Text>
          {!summary.isComplete ? (
            <Text maxFontSizeMultiplier={1.4} style={styles.caption}>
              {copy.inProgress}
            </Text>
          ) : null}
        </View>
        <Pressable
          accessibilityLabel={copy.nextMonth}
          accessibilityRole="button"
          disabled={index === 0}
          hitSlop={8}
          onPress={() => move(-1)}
          style={({ pressed }) => [styles.monthArrow, index === 0 ? styles.hidden : null, pressed ? styles.pressed : null]}
        >
          <SymbolView
            name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
            size={17}
            tintColor={overviewColors.textPrimary}
          />
        </Pressable>
      </View>

      {isEmpty ? (
        <Text maxFontSizeMultiplier={1.5} style={styles.caption}>
          {copy.empty}
        </Text>
      ) : (
        <>
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
              {change !== null ? (
                <Text
                  maxFontSizeMultiplier={1.4}
                  style={[styles.change, { color: change > 0 ? overviewColors.negative : overviewColors.positive }]}
                >
                  {copy.versusPrevious(formatChange(change), change > 0)}
                </Text>
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
              )}
              averageLabel={copy.average}
              averageMinor={summary.dailyExpenseMinor}
              dailyExpensesMinor={summary.dailyExpensesMinor}
              elapsedDays={summary.elapsedDays}
            />
            <Text maxFontSizeMultiplier={1.4} style={styles.caption}>
              {copy.total(
                formatAmount(summary.expenseMinor, reportingCurrency),
                formatTransactionCount(summary.expenseCount),
              )}
            </Text>
          </View>

          {summary.categories.length > 0 ? (
            <SheetSection label={copy.categories}>
              <View style={styles.shareList}>
                {summary.categories.map((group) => (
                  <ShareRow
                    detail={formatShare(group.share)}
                    fraction={topCategoryMinor === 0 ? 0 : group.totalMinor / topCategoryMinor}
                    group={group}
                    key={group.key}
                    tint={bubbleTints.expense.film}
                    value={formatAmount(group.totalMinor, reportingCurrency)}
                  />
                ))}
              </View>
            </SheetSection>
          ) : null}

          {summary.merchants.length > 0 ? (
            <SheetSection label={copy.merchants}>
              <View style={styles.shareList}>
                {summary.merchants.map((group) => (
                  <ShareRow
                    detail={formatAmount(group.totalMinor, reportingCurrency)}
                    fraction={topMerchantCount === 0 ? 0 : group.count / topMerchantCount}
                    group={group}
                    key={group.key}
                    tint={bubbleTints.net.film}
                    value={copy.payments(group.count)}
                  />
                ))}
              </View>
            </SheetSection>
          ) : null}

          <View style={styles.section}>
            <Text maxFontSizeMultiplier={1.4} style={styles.sectionLabel}>
              {copy.highlights.toLocaleUpperCase()}
            </Text>
            <View style={styles.highlights}>
              {summary.busiestDay !== null && busiestLabel !== null ? (
                <Highlight
                  detail={busiestLabel}
                  label={copy.busiestDay}
                  value={formatCompactAmount(summary.busiestDay.totalMinor, reportingCurrency)}
                />
              ) : null}
              {summary.largestExpense !== null ? (
                <Highlight
                  detail={transactionTitle(summary.largestExpense, rules)}
                  label={copy.largest}
                  value={formatCompactAmount(summary.largestExpense.amountMinor, reportingCurrency)}
                />
              ) : null}
              <Highlight
                label={copy.noSpendDays}
                value={copy.noSpendValue(summary.noSpendDays, summary.elapsedDays)}
              />
              <Highlight label={copy.perDayCount} value={perDayCount} />
            </View>
          </View>

          <SheetSection label={copy.flow}>
            <SheetRow
              isFirst
              label={copy.received}
              value={`+${formatAmount(summary.incomeMinor, reportingCurrency)}`}
              valueTone="positive"
            />
            <SheetRow
              label={copy.net}
              value={formatSignedAmount(summary.netMinor, reportingCurrency)}
              valueTone={summary.netMinor < 0 ? 'negative' : 'positive'}
            />
            {summary.recurringMinor > 0 ? (
              <SheetRow
                label={copy.recurring}
                value={copy.recurringValue(
                  formatAmount(summary.recurringMinor, reportingCurrency),
                  formatShare(summary.expenseMinor === 0 ? 0 : summary.recurringMinor / summary.expenseMinor),
                )}
              />
            ) : null}
          </SheetSection>

          {summary.events.length > 0 ? (
            <SheetSection label={copy.events}>
              {summary.events.map((entry, rowIndex) => (
                <SheetRow
                  isFirst={rowIndex === 0}
                  key={entry.event.id}
                  label={entry.event.name}
                  value={formatAmount(entry.expenseMinor, reportingCurrency)}
                />
              ))}
            </SheetSection>
          ) : null}
        </>
      )}

      <SheetSection footnote={reminder.isDenied ? copy.reminderDenied : copy.reminderDetail}>
        <SheetSwitchRow
          isFirst
          label={copy.reminder}
          onChange={(value) => void reminder.setEnabled(value)}
          value={reminder.isEnabled}
        />
      </SheetSection>
    </SheetLayout>
  );
}

const styles = StyleSheet.create({
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: overviewSpacing.row,
  },
  monthArrow: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: overviewColors.surfacePressed,
  },
  hidden: {
    opacity: 0,
  },
  monthTitle: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  monthName: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: overviewColors.textPrimary,
  },
  card: {
    gap: overviewSpacing.block,
    padding: overviewSpacing.block,
    borderRadius: 18,
    backgroundColor: overviewColors.surface,
  },
  heroRow: {
    gap: 4,
  },
  hero: {
    gap: 2,
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
    color: overviewColors.textSecondary,
  },
  amount: {
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -1,
    color: overviewColors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  change: {
    fontSize: 13,
    fontWeight: '600',
    color: overviewColors.textSecondary,
  },
  section: {
    gap: overviewSpacing.tight,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.6,
    color: overviewColors.textSecondary,
  },
  shareList: {
    gap: overviewSpacing.block,
    padding: overviewSpacing.block,
  },
  shareRow: {
    gap: 6,
  },
  shareHeading: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
  },
  shareName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: overviewColors.textPrimary,
  },
  shareValue: {
    fontSize: 15,
    fontWeight: '600',
    color: overviewColors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  shareTrack: {
    height: 6,
    overflow: 'hidden',
    borderRadius: 3,
    backgroundColor: overviewColors.surfacePressed,
  },
  shareFill: {
    height: '100%',
    borderRadius: 3,
  },
  shareDetail: {
    fontSize: 12,
    color: overviewColors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  highlights: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: overviewSpacing.tight,
  },
  highlight: {
    flexGrow: 1,
    flexBasis: '45%',
    gap: 4,
    padding: overviewSpacing.block,
    borderRadius: 18,
    backgroundColor: overviewColors.surface,
  },
  highlightLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: overviewColors.textSecondary,
  },
  highlightValue: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: overviewColors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  highlightDetail: {
    fontSize: 12,
    color: overviewColors.textSecondary,
  },
  pressed: {
    opacity: 0.6,
  },
});
