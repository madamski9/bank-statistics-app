import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet } from 'react-native';

import { useCopy } from '@/features/app-shell/localization/language';
import { overviewColors } from '@/features/app-shell/theme/overview-theme';
import type { IgnoreTarget } from '@/features/data/ignored-payments/ignore-rule';
import { ignoredPaymentsCopy } from '@/features/data/ignored-payments/ignored-payments-copy';
import { AmountText } from '@/features/settings/privacy/amounts/amount-text';
import { selectionChanged } from '@/haptics';

interface IgnorePaymentButtonProps {
  target: IgnoreTarget;
  isIgnoring: boolean;
  isDisabled: boolean;
  onPress: () => void;
}

export function IgnorePaymentButton({ target, isIgnoring, isDisabled, onPress }: IgnorePaymentButtonProps) {
  const copy = useCopy(ignoredPaymentsCopy);

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      onPress={() => {
        selectionChanged();
        onPress();
      }}
      style={({ pressed }) => [styles.ignoreButton, pressed ? styles.pressed : null]}
    >
      <SymbolView
        name={
          isIgnoring
            ? { ios: 'checkmark.circle', android: 'check_circle', web: 'check_circle' }
            : { ios: 'eye.slash', android: 'visibility_off', web: 'visibility_off' }
        }
        size={16}
        tintColor={isIgnoring ? overviewColors.textSecondary : overviewColors.textPrimary}
      />
      <AmountText
        maxFontSizeMultiplier={1.4}
        numberOfLines={2}
        style={[styles.ignoreLabel, isIgnoring ? styles.ignoreLabelActive : null]}
      >
        {isIgnoring
          ? copy.detailSkipping(target.name)
          : copy.detailAction[target.kind](target.name)}
      </AmountText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  ignoreButton: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    borderRadius: 17,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: overviewColors.hairline,
    backgroundColor: overviewColors.surface,
  },
  ignoreLabel: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    color: overviewColors.textPrimary,
  },
  ignoreLabelActive: {
    color: overviewColors.textSecondary,
  },
  pressed: {
    opacity: 0.6,
  },
});
