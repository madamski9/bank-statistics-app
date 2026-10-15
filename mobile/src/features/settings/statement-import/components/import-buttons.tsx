import { Pressable, StyleSheet, Text } from 'react-native';

import { overviewColors, overviewSpacing } from '@/features/app-shell/theme/overview-theme';

interface ImportButtonProps {
  label: string;
  isDisabled?: boolean;
  isDimmed?: boolean;
  onPress: () => void;
}

export function PrimaryImportButton({ label, isDisabled = false, isDimmed = false, onPress }: ImportButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={isDisabled ? { disabled: true } : undefined}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        isDimmed ? styles.disabled : null,
        pressed ? styles.pressed : null,
      ]}
    >
      <Text maxFontSizeMultiplier={1.3} style={styles.primaryLabel}>
        {label}
      </Text>
    </Pressable>
  );
}

export function SecondaryImportButton({ label, isDisabled = false, onPress }: ImportButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [styles.secondaryButton, pressed ? styles.pressed : null]}
    >
      <Text maxFontSizeMultiplier={1.3} style={styles.secondaryLabel}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  primaryButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 26,
    paddingHorizontal: overviewSpacing.block,
    backgroundColor: overviewColors.textPrimary,
  },
  primaryLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: overviewColors.background,
  },
  secondaryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: overviewColors.textSecondary,
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.6,
  },
});
