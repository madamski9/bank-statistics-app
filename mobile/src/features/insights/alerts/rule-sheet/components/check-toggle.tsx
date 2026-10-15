import { Pressable, StyleSheet, Text, View } from 'react-native';

import { overviewColors } from '@/features/app-shell/theme/overview-theme';

interface CheckToggleProps {
  label: string;
  hint: string;
  isOn: boolean;
  onToggle: () => void;
}

export function CheckToggle({ label, hint, isOn, onToggle }: CheckToggleProps) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: isOn }}
      onPress={onToggle}
      style={({ pressed }) => [styles.toggle, pressed ? styles.pressed : null]}
    >
      <View style={[styles.checkbox, isOn ? styles.checkboxOn : null]}>
        {isOn ? (
          <Text maxFontSizeMultiplier={1.2} style={styles.checkmark}>
            ✓
          </Text>
        ) : null}
      </View>
      <View style={styles.toggleCopy}>
        <Text maxFontSizeMultiplier={1.4} style={styles.toggleLabel}>
          {label}
        </Text>
        <Text maxFontSizeMultiplier={1.4} style={styles.toggleHint}>
          {hint}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  toggle: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    minHeight: 44,
  },
  toggleCopy: {
    flex: 1,
    gap: 2,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: overviewColors.textPrimary,
  },
  toggleHint: {
    fontSize: 13,
    lineHeight: 18,
    color: overviewColors.textSecondary,
  },
  checkbox: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    backgroundColor: overviewColors.surface,
  },
  checkboxOn: {
    backgroundColor: overviewColors.surfacePressed,
  },
  checkmark: {
    fontSize: 13,
    fontWeight: '700',
    color: overviewColors.textPrimary,
  },
  pressed: {
    opacity: 0.6,
  },
});
