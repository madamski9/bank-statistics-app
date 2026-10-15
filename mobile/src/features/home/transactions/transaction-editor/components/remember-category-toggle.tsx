import { Pressable, StyleSheet, Text, View } from 'react-native';

import { overviewColors } from '@/features/app-shell/theme/overview-theme';

interface RememberCategoryToggleProps {
  label: string;
  isOn: boolean;
  onPress: () => void;
}

export function RememberCategoryToggle({ label, isOn, onPress }: RememberCategoryToggleProps) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: isOn }}
      onPress={onPress}
      style={({ pressed }) => [styles.remember, pressed ? styles.pressed : null]}
    >
      <View style={[styles.checkbox, isOn ? styles.checkboxOn : null]}>
        {isOn ? (
          <Text maxFontSizeMultiplier={1.2} style={styles.checkmark}>
            ✓
          </Text>
        ) : null}
      </View>
      <Text maxFontSizeMultiplier={1.4} style={styles.rememberLabel}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  remember: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 44,
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
  rememberLabel: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: overviewColors.textSecondary,
  },
  pressed: {
    opacity: 0.6,
  },
});
