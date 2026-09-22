import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import type { SpendingDimension } from '@/features/classification/spending-groups';
import { overviewColors } from '@/features/spending-overview/overview-theme';
import { selectionChanged } from '@/haptics';

interface DimensionSwitcherProps {
  dimension: SpendingDimension;
  onChange: (dimension: SpendingDimension) => void;
}

const dimensions: { value: SpendingDimension; label: string; hint: string }[] = [
  { value: 'merchant', label: 'Sklepy', hint: 'Wydatki w sklepach' },
  { value: 'counterparty', label: 'Osoby', hint: 'Przelewy do osób i firm' },
  { value: 'category', label: 'Kategorie', hint: 'Wydatki według kategorii' },
];

export function DimensionSwitcher({ dimension, onChange }: DimensionSwitcherProps) {
  return (
    <View accessibilityRole="tablist" style={styles.row}>
      {dimensions.map((option) => {
        const isSelected = option.value === dimension;

        return (
          <Pressable
            accessibilityLabel={option.hint}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            hitSlop={6}
            key={option.value}
            onPress={() => {
              if (isSelected) {
                return;
              }

              selectionChanged();
              onChange(option.value);
            }}
            style={({ pressed }) => [
              styles.tab,
              isSelected ? styles.tabSelected : null,
              pressed ? styles.pressed : null,
            ]}
          >
            <Animated.Text
              maxFontSizeMultiplier={1.4}
              style={[styles.label, isSelected ? styles.labelSelected : null]}
            >
              {option.label}
            </Animated.Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tab: {
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 17,
    backgroundColor: overviewColors.surface,
  },
  tabSelected: {
    backgroundColor: overviewColors.surfacePressed,
  },
  pressed: {
    opacity: 0.6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
    color: overviewColors.textSecondary,
  },
  labelSelected: {
    fontWeight: '700',
    color: overviewColors.textPrimary,
  },
});
