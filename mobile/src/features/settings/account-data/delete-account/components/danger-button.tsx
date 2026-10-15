import { Pressable, StyleSheet, Text } from 'react-native';

import { overviewColors } from '@/features/app-shell/theme/overview-theme';

export function DangerButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.danger, pressed ? styles.pressed : null]}
    >
      <Text maxFontSizeMultiplier={1.4} style={styles.dangerLabel}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  danger: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: overviewColors.negative,
  },
  dangerLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: overviewColors.background,
  },
  pressed: {
    opacity: 0.6,
  },
});
