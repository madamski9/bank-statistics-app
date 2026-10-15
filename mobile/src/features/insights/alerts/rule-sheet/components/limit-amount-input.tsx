import { StyleSheet, Text, TextInput, View } from 'react-native';

import { useCopy } from '@/features/app-shell/localization/language';
import { overviewColors } from '@/features/app-shell/theme/overview-theme';

import { alertsCopy } from '../../alerts-copy';
import { FormField } from './form-field';

interface LimitAmountInputProps {
  amount: string;
  onChange: (amount: string) => void;
}

export function LimitAmountInput({ amount, onChange }: LimitAmountInputProps) {
  const copy = useCopy(alertsCopy);

  return (
    <FormField label={copy.amount}>
      <View style={styles.amountRow}>
        <TextInput
          accessibilityLabel={copy.amount}
          keyboardType="decimal-pad"
          onChangeText={onChange}
          placeholder={copy.amountPlaceholder}
          placeholderTextColor={overviewColors.textDisabled}
          selectionColor={overviewColors.textPrimary}
          style={styles.amountInput}
          value={amount}
        />
        <Text maxFontSizeMultiplier={1.3} style={styles.currency}>
          zł
        </Text>
      </View>
    </FormField>
  );
}

const styles = StyleSheet.create({
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: -1,
    color: overviewColors.textPrimary,
  },
  currency: {
    fontSize: 20,
    fontWeight: '600',
    color: overviewColors.textSecondary,
  },
});
