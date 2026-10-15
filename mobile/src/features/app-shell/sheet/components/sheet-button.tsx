import { Pressable, StyleSheet } from 'react-native';

import { overviewColors, overviewSpacing } from '@/features/app-shell/theme/overview-theme';
import { AmountText } from '@/features/settings/privacy/amounts/amount-text';

interface SheetButtonProps {
  label: string;
  tone?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  onPress: () => void;
}

export function SheetButton({ label, tone = 'secondary', disabled = false, onPress }: SheetButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        buttonStyles[tone],
        disabled ? styles.disabled : null,
        pressed ? styles.pressed : null,
      ]}
    >
      <AmountText maxFontSizeMultiplier={1.4} style={[styles.buttonLabel, buttonLabelStyles[tone]]}>
        {label}
      </AmountText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: overviewSpacing.block,
    borderRadius: 16,
  },
  buttonLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.6,
  },
});

const buttonStyles = StyleSheet.create({
  primary: { backgroundColor: overviewColors.textPrimary },
  secondary: { backgroundColor: overviewColors.surfacePressed },
  danger: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 92, 122, 0.35)',
    backgroundColor: 'rgba(255, 92, 122, 0.08)',
  },
});

const buttonLabelStyles = StyleSheet.create({
  primary: { color: overviewColors.background },
  secondary: { color: overviewColors.textPrimary },
  danger: { color: overviewColors.negative },
});
