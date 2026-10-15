import { StyleSheet, TextInput, View } from 'react-native';

import { useCopy } from '@/features/app-shell/localization/language';
import { overviewColors } from '@/features/app-shell/theme/overview-theme';

import { transactionsCopy } from '../../transactions-copy';

interface AmountInputProps {
  amount: string;
  currency: string;
  autoFocus: boolean;
  onChangeAmount: (amount: string) => void;
  onChangeCurrency: (currency: string) => void;
}

export function AmountInput({ amount, currency, autoFocus, onChangeAmount, onChangeCurrency }: AmountInputProps) {
  const copy = useCopy(transactionsCopy);

  return (
    <View style={styles.amountRow}>
      <TextInput
        accessibilityLabel={copy.amount}
        autoFocus={autoFocus}
        keyboardType="decimal-pad"
        onChangeText={onChangeAmount}
        placeholder="0,00"
        placeholderTextColor={overviewColors.textDisabled}
        selectionColor={overviewColors.textPrimary}
        style={styles.amountInput}
        value={amount}
      />
      <TextInput
        accessibilityLabel={copy.currency}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={3}
        onChangeText={onChangeCurrency}
        selectionColor={overviewColors.textPrimary}
        style={styles.currencyInput}
        value={currency}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  amountInput: {
    flex: 1,
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: -1,
    color: overviewColors.textPrimary,
  },
  currencyInput: {
    minWidth: 72,
    textAlign: 'right',
    fontSize: 20,
    fontWeight: '600',
    color: overviewColors.textSecondary,
  },
});
