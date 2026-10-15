import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useCopy } from '@/features/app-shell/localization/language';
import { SheetRow } from '@/features/app-shell/sheet/components/sheet-row';
import { SheetSection } from '@/features/app-shell/sheet/components/sheet-section';
import { overviewColors, overviewSpacing } from '@/features/app-shell/theme/overview-theme';
import type { CategorizationRule } from '@/features/data/classification/categorization-rule';
import { reportingCurrency } from '@/features/data/currency-conversion/exchange-rate';
import { transactionParty } from '@/features/home/merchants/naming/transaction-party';
import { useAmountFormatting } from '@/features/settings/privacy/amounts/use-private-amounts';
import { selectionChanged } from '@/haptics';

import type { expenseDaysOf } from '../../monthly-summary';
import { monthlySummaryCopy } from '../../monthly-summary-copy';

type ExpenseDay = ReturnType<typeof expenseDaysOf>[number];

interface DayTransactionsProps {
  days: ExpenseDay[];
  rules: CategorizationRule[];
  selectedDay: number | null;
  dayDate: (day: number) => string;
  onShowAllDays: () => void;
}

export function DayTransactions({ days, rules, selectedDay, dayDate, onShowAllDays }: DayTransactionsProps) {
  const copy = useCopy(monthlySummaryCopy);
  const { formatAmount } = useAmountFormatting();
  const visibleDays = selectedDay === null ? days : days.filter((expenseDay) => expenseDay.day === selectedDay);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text maxFontSizeMultiplier={1.4} style={styles.sectionLabel}>
          {copy.dayTransactions.toLocaleUpperCase()}
        </Text>
        {selectedDay !== null ? (
          <Pressable
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => {
              selectionChanged();
              onShowAllDays();
            }}
            style={({ pressed }) => (pressed ? styles.pressed : null)}
          >
            <Text maxFontSizeMultiplier={1.4} style={styles.showAll}>
              {copy.showAllDays}
            </Text>
          </Pressable>
        ) : null}
      </View>
      <Text maxFontSizeMultiplier={1.4} style={styles.caption}>
        {selectedDay === null ? copy.dayTransactionsHint : copy.selectedDayHint}
      </Text>
      {visibleDays.map((expenseDay) => (
        <SheetSection
          key={expenseDay.day}
          label={copy.dayHeading(dayDate(expenseDay.day), formatAmount(expenseDay.totalMinor, reportingCurrency))}
        >
          {expenseDay.records.map((record, index) => (
            <SheetRow
              isFirst={index === 0}
              key={record.id}
              label={transactionParty(record, rules)}
              value={`− ${formatAmount(record.amountMinor, record.currency)}`}
            />
          ))}
        </SheetSection>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: overviewSpacing.tight },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  showAll: { fontSize: 13, fontWeight: '600', color: overviewColors.textPrimary },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.6,
    color: overviewColors.textSecondary,
  },
  caption: { fontSize: 13, lineHeight: 18, color: overviewColors.textSecondary },
  pressed: { opacity: 0.6 },
});
