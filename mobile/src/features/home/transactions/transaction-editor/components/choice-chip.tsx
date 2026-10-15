import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { overviewColors } from '@/features/app-shell/theme/overview-theme';

interface ChoiceChipProps {
  label: string;
  isActive?: boolean;
  isSelectable?: boolean;
  numberOfLines?: number;
  onPress: () => void;
}

export function ChoiceChip({ label, isActive = false, isSelectable = true, numberOfLines, onPress }: ChoiceChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={isSelectable ? { selected: isActive } : undefined}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        isActive ? styles.chipActive : null,
        pressed ? styles.pressed : null,
      ]}
    >
      <Text
        maxFontSizeMultiplier={1.3}
        numberOfLines={numberOfLines}
        style={[styles.chipLabel, isActive ? styles.chipLabelActive : null]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

interface ChoiceGroupProps {
  label: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function ChoiceGroup({ label, children, footer }: ChoiceGroupProps) {
  return (
    <View style={styles.group}>
      <Text maxFontSizeMultiplier={1.4} style={styles.sectionLabel}>
        {label}
      </Text>
      <View style={styles.chips}>{children}</View>
      {footer}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: 10,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: overviewColors.textSecondary,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 17,
    backgroundColor: overviewColors.surface,
  },
  chipActive: {
    backgroundColor: overviewColors.surfacePressed,
  },
  chipLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: overviewColors.textSecondary,
  },
  chipLabelActive: {
    color: overviewColors.textPrimary,
  },
  pressed: {
    opacity: 0.6,
  },
});
