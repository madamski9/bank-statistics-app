import type { IngestionRecord } from '@bankstats/ingestion-native';
import { SymbolView } from 'expo-symbols';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { CategorizationRule } from '@/features/classification/categorization-rule';
import { reportingCurrency } from '@/features/currency-conversion/exchange-rate';
import type { SpendingEvent } from '@/features/events/spending-event';
import { SheetLayout, SheetRow, SheetSection, SheetSwitchRow } from '@/features/insights/sheet-layout';
import { calendarCopy } from '@/features/localization/calendar-copy';
import { useCopy } from '@/features/localization/language';
import { useAmountFormatting } from '@/features/privacy/use-private-amounts';
import {
  formatChange,
  formatShare,
  formatTransactionCount,
} from '@/features/spending-overview/formatting';
import { overviewColors, overviewSpacing } from '@/features/spending-overview/overview-theme';
import type { RecurringPayment } from '@/features/subscriptions/recurring-payments';
import { formatDayHeading } from '@/features/transactions/format-date';
import { transactionTitle } from '@/features/transactions/transaction-record';
import { selectionChanged } from '@/haptics';

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
  const { formatAmount, formatSignedAmount } = useAmountFormatting();
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
          style={({ pressed }) => [styles.monthArrow, index >= months.length - 1 ? styles.hidden : null, pressed ? styles.pressed : null]}
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
          <View style={styles.hero}>
            <Text maxFontSizeMultiplier={1.4} style={styles.caption}>
              {copy.spent}
            </Text>
            <Text adjustsFontSizeToFit maxFontSizeMultiplier={1.3} numberOfLines={1} style={styles.amount}>
              {formatAmount(summary.expenseMinor, reportingCurrency)}
            </Text>
            <Text maxFontSizeMultiplier={1.4} style={styles.caption}>
              {formatTransactionCount(summary.expenseCount)} ·{' '}
              {copy.perDay(formatAmount(summary.dailyExpenseMinor, reportingCurrency))}
            </Text>
            <Text
              maxFontSizeMultiplier={1.4}
              style={[
                styles.change,
                summary.expenseChange === null
                  ? null
                  : { color: summary.expenseChange > 0 ? overviewColors.negative : overviewColors.positive },
              ]}
            >
              {summary.expenseChange === null
                ? copy.noPrevious
                : copy.versusPrevious(formatChange(summary.expenseChange), summary.expenseChange > 0)}
            </Text>
          </View>

          <SheetSection>
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

          {summary.categories.length > 0 ? (
            <SheetSection label={copy.categories}>
              {summary.categories.map((group, rowIndex) => (
                <SheetRow
                  detail={formatShare(group.share)}
                  isFirst={rowIndex === 0}
                  key={group.key}
                  label={group.name}
                  value={formatAmount(group.totalMinor, reportingCurrency)}
                />
              ))}
            </SheetSection>
          ) : null}

          {summary.merchants.length > 0 ? (
            <SheetSection label={copy.merchants}>
              {summary.merchants.map((group, rowIndex) => (
                <SheetRow
                  detail={formatTransactionCount(group.count)}
                  isFirst={rowIndex === 0}
                  key={group.key}
                  label={group.name}
                  value={formatAmount(group.totalMinor, reportingCurrency)}
                />
              ))}
            </SheetSection>
          ) : null}

          {summary.largestExpense !== null ? (
            <SheetSection label={copy.largest}>
              <SheetRow
                detail={formatDayHeading(new Date(summary.largestExpense.occurredAt), now)}
                isFirst
                label={transactionTitle(summary.largestExpense, rules)}
                value={formatAmount(summary.largestExpense.amountMinor, reportingCurrency)}
              />
            </SheetSection>
          ) : null}

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
  hero: {
    gap: 4,
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
    color: overviewColors.textSecondary,
  },
  amount: {
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: -1.2,
    color: overviewColors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  change: {
    fontSize: 13,
    fontWeight: '600',
    color: overviewColors.textSecondary,
  },
  pressed: {
    opacity: 0.6,
  },
});
