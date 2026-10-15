import type { IngestionRecord } from '@bankstats/ingestion-native';
import { SymbolView } from 'expo-symbols';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatShare } from '@/features/app-shell/formatting/formatting';
import { calendarCopy } from '@/features/app-shell/localization/calendar-copy';
import { useCopy } from '@/features/app-shell/localization/language';
import { SheetLayout } from '@/features/app-shell/sheet/sheet-layout';
import { overviewColors, overviewSpacing } from '@/features/app-shell/theme/overview-theme';
import type { CategorizationRule } from '@/features/data/classification/categorization-rule';
import { AmountText } from '@/features/settings/privacy/amounts/amount-text';
import { selectionChanged } from '@/haptics';

import { MonthComparisonChart } from '../charts/month-comparison';
import {
  compareMonths,
  expenseDaysOf,
  recordsForSummaryGroup,
  summarizeMonth,
  type SummaryMonth,
} from '../monthly-summary';
import { monthlySummaryCopy } from '../monthly-summary-copy';
import { DayTransactions } from './components/day-transactions';
import { GroupAverageCard } from './components/group-average-card';

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
  const groupRecords = useMemo(
    () => recordsForSummaryGroup(records, month, rules, group.dimension, group.key),
    [group.dimension, group.key, month, records, rules],
  );
  const summary = useMemo(
    () => summarizeMonth(groupRecords, month, { rules, events: [], recurring: [], now }),
    [groupRecords, month, now, rules],
  );
  const comparedMonths = useMemo(() => compareMonths(groupRecords, month, now), [groupRecords, month, now]);
  const expenseDays = useMemo(() => expenseDaysOf(groupRecords, month), [groupRecords, month]);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const dayDate = (day: number) => calendar.dayMonth(day, calendar.monthsInGenitive[month.month] ?? '');

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
        <AmountText maxFontSizeMultiplier={1.4} style={styles.caption}>
          {copy.groupDetail(
            copy.payments(summary.expenseCount),
            formatShare(monthExpenseMinor === 0 ? 0 : summary.expenseMinor / monthExpenseMinor),
          )}
        </AmountText>
      </View>

      <GroupAverageCard dayDate={dayDate} onSelectDay={setSelectedDay} selectedDay={selectedDay} summary={summary} />

      {expenseDays.length > 0 ? (
        <DayTransactions
          dayDate={dayDate}
          days={expenseDays}
          onShowAllDays={() => setSelectedDay(null)}
          rules={rules}
          selectedDay={selectedDay}
        />
      ) : null}

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
  caption: { fontSize: 13, lineHeight: 18, color: overviewColors.textSecondary },
  section: { gap: overviewSpacing.tight },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.6,
    color: overviewColors.textSecondary,
  },
  pressed: { opacity: 0.6 },
});
