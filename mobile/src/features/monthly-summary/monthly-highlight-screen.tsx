import type { IngestionRecord } from '@bankstats/ingestion-native';
import { SymbolView } from 'expo-symbols';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { SheetLayout, SheetRow, SheetSection } from '@/features/app-shell/sheet-layout';
import type { CategorizationRule } from '@/features/classification/categorization-rule';
import { reportingCurrency } from '@/features/currency-conversion/exchange-rate';
import { calendarCopy } from '@/features/localization/calendar-copy';
import { useCopy } from '@/features/localization/language';
import { transactionParty } from '@/features/merchants/transaction-party';
import { AmountText } from '@/features/privacy/amount-text';
import { useAmountFormatting } from '@/features/privacy/use-private-amounts';
import { overviewColors } from '@/features/spending-overview/overview-theme';
import { selectionChanged } from '@/haptics';

import {
  expenseDaysOf,
  largestExpensesOf,
  noSpendDaysOf,
  type MonthlySummary,
  type SummaryMonth,
} from './monthly-summary';
import { monthlySummaryCopy } from './monthly-summary-copy';

export type HighlightSelection =
  | { kind: 'day'; day: number }
  | { kind: 'largest' }
  | { kind: 'noSpend' }
  | { kind: 'perDay' };

interface MonthlyHighlightScreenProps {
  records: IngestionRecord[];
  rules: CategorizationRule[];
  month: SummaryMonth;
  summary: MonthlySummary;
  highlight: HighlightSelection;
  onBack: () => void;
  onClose: () => void;
}

export function MonthlyHighlightScreen({
  records,
  rules,
  month,
  summary,
  highlight,
  onBack,
  onClose,
}: MonthlyHighlightScreenProps) {
  const copy = useCopy(monthlySummaryCopy);
  const calendar = useCopy(calendarCopy);
  const { formatAmount } = useAmountFormatting();
  const [openedDay, setOpenedDay] = useState<number | null>(null);
  const expenseDays = useMemo(() => expenseDaysOf(records, month), [month, records]);
  const largest = useMemo(() => largestExpensesOf(records, month), [month, records]);
  const noSpendDays = useMemo(() => noSpendDaysOf(summary), [summary]);
  const dayDate = (day: number) => calendar.dayMonth(day, calendar.monthsInGenitive[month.month] ?? '');
  const shownDay = highlight.kind === 'day' ? highlight.day : openedDay;

  const openDay = (day: number) => {
    selectionChanged();
    setOpenedDay(day);
  };

  const goBack = () => {
    selectionChanged();

    if (highlight.kind !== 'day' && openedDay !== null) {
      setOpenedDay(null);
      return;
    }

    onBack();
  };

  const backButton = (
    <Pressable
      accessibilityLabel={copy.backToReport}
      accessibilityRole="button"
      onPress={goBack}
      style={({ pressed }) => [styles.backButton, pressed ? styles.pressed : null]}
    >
      <SymbolView
        name={{ ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }}
        size={18}
        tintColor={overviewColors.textPrimary}
      />
    </Pressable>
  );

  if (shownDay !== null) {
    const expenseDay = expenseDays.find((candidate) => candidate.day === shownDay);
    const dayRecords = expenseDay?.records ?? [];

    return (
      <SheetLayout closeLabel={copy.done} leading={backButton} onClose={onClose} title={dayDate(shownDay)}>
        <AmountText maxFontSizeMultiplier={1.4} style={styles.caption}>
          {copy.dayCaption(
            copy.payments(dayRecords.length),
            formatAmount(expenseDay?.totalMinor ?? 0, reportingCurrency),
          )}
        </AmountText>
        {dayRecords.length > 0 ? (
          <SheetSection>
            {dayRecords.map((record, index) => (
              <SheetRow
                isFirst={index === 0}
                key={record.id}
                label={transactionParty(record, rules)}
                value={`− ${formatAmount(record.amountMinor, record.currency)}`}
              />
            ))}
          </SheetSection>
        ) : null}
      </SheetLayout>
    );
  }

  if (highlight.kind === 'largest') {
    return (
      <SheetLayout closeLabel={copy.done} leading={backButton} onClose={onClose} title={copy.largestExpenses}>
        <SheetSection>
          {largest.map((record, index) => {
            const day = new Date(record.occurredAt).getDate();

            return (
              <SheetRow
                accessibilityHint={copy.openDay}
                detail={dayDate(day)}
                isFirst={index === 0}
                key={record.id}
                label={transactionParty(record, rules)}
                onPress={() => openDay(day)}
                value={`− ${formatAmount(record.amountMinor, record.currency)}`}
              />
            );
          })}
        </SheetSection>
      </SheetLayout>
    );
  }

  if (highlight.kind === 'noSpend') {
    return (
      <SheetLayout closeLabel={copy.done} leading={backButton} onClose={onClose} title={copy.noSpendDays}>
        <Text maxFontSizeMultiplier={1.4} style={styles.caption}>
          {noSpendDays.length === 0 ? copy.noSpendNone : copy.noSpendCaption(noSpendDays.length, summary.elapsedDays)}
        </Text>
        {noSpendDays.length > 0 ? (
          <SheetSection>
            {noSpendDays.map((day, index) => (
              <SheetRow detail={copy.noSpendDayDetail} isFirst={index === 0} key={day} label={dayDate(day)} />
            ))}
          </SheetSection>
        ) : null}
      </SheetLayout>
    );
  }

  const chronological = [...expenseDays].sort((left, right) => left.day - right.day);

  return (
    <SheetLayout closeLabel={copy.done} leading={backButton} onClose={onClose} title={copy.perDayTitle}>
      <SheetSection>
        {chronological.map((expenseDay, index) => (
          <SheetRow
            accessibilityHint={copy.openDay}
            detail={copy.payments(expenseDay.records.length)}
            isFirst={index === 0}
            key={expenseDay.day}
            label={dayDate(expenseDay.day)}
            onPress={() => openDay(expenseDay.day)}
            value={`− ${formatAmount(expenseDay.totalMinor, reportingCurrency)}`}
          />
        ))}
      </SheetSection>
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
  caption: { fontSize: 13, lineHeight: 18, color: overviewColors.textSecondary },
  pressed: { opacity: 0.6 },
});
