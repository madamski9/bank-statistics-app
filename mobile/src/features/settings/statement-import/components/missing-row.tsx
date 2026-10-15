import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useCopy } from '@/features/app-shell/localization/language';
import { overviewColors, overviewSpacing } from '@/features/app-shell/theme/overview-theme';
import { transactionsCopy } from '@/features/home/transactions/transactions-copy';
import { useAmountFormatting } from '@/features/settings/privacy/amounts/use-private-amounts';

import { displayDate } from '../display-date';
import type { ReconciledRow } from '../parsing/statement-reconciliation';
import { statementImportCopy } from '../statement-import-copy';

interface MissingRowProps {
  item: ReconciledRow;
  isSelected: boolean;
  onToggle: (key: string) => void;
}

export function MissingRow({ item, isSelected, onToggle }: MissingRowProps) {
  const copy = useCopy(statementImportCopy);
  const transactions = useCopy(transactionsCopy);
  const { formatSignedAmount } = useAmountFormatting();
  const { row } = item;
  const name =
    row.party ?? (row.transactionType === undefined ? copy.noName : transactions.types[row.transactionType]);
  const signedMinor = row.direction === 'expense' ? -row.amountMinor : row.amountMinor;

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: isSelected }}
      onPress={() => onToggle(item.key)}
      style={({ pressed }) => [styles.row, pressed ? styles.rowPressed : null]}
    >
      <SymbolView
        accessibilityElementsHidden
        importantForAccessibility="no"
        name={
          isSelected
            ? { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }
            : { ios: 'circle', android: 'radio_button_unchecked', web: 'radio_button_unchecked' }
        }
        size={22}
        tintColor={isSelected ? overviewColors.positive : overviewColors.textSecondary}
      />
      <View style={styles.rowText}>
        <Text maxFontSizeMultiplier={1.4} numberOfLines={1} style={styles.rowLabel}>
          {name}
        </Text>
        <Text maxFontSizeMultiplier={1.4} style={styles.rowDetail}>
          {displayDate(row.date)}
        </Text>
      </View>
      <Text
        maxFontSizeMultiplier={1.4}
        style={[styles.rowAmount, row.direction === 'income' ? styles.income : null]}
      >
        {formatSignedAmount(signedMinor, row.currency)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: overviewSpacing.row,
    paddingHorizontal: overviewSpacing.block,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: overviewColors.hairline,
  },
  rowPressed: {
    backgroundColor: overviewColors.surfacePressed,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: overviewColors.textPrimary,
  },
  rowDetail: {
    fontSize: 13,
    color: overviewColors.textSecondary,
  },
  rowAmount: {
    fontSize: 16,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    color: overviewColors.textPrimary,
  },
  income: {
    color: overviewColors.positive,
  },
});
