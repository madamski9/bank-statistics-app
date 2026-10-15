import { Pressable, StyleSheet, Text, View } from 'react-native';

import { overviewColors } from '@/features/app-shell/theme/overview-theme';
import { selectionChanged } from '@/haptics';

interface ChipOption<Value> {
  key: string;
  value: Value;
  label: string;
}

interface OptionChipsProps<Value> {
  options: ChipOption<Value>[];
  selected: Value;
  onSelect: (value: Value) => void;
}

export function OptionChips<Value>({ options, selected, onSelect }: OptionChipsProps<Value>) {
  return (
    <View style={styles.chips}>
      {options.map((option) => {
        const isActive = option.value === selected;

        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            key={option.key}
            onPress={() => {
              selectionChanged();
              onSelect(option.value);
            }}
            style={({ pressed }) => [
              styles.chip,
              isActive ? styles.chipActive : null,
              pressed ? styles.pressed : null,
            ]}
          >
            <Text
              maxFontSizeMultiplier={1.3}
              style={[styles.chipLabel, isActive ? styles.chipLabelActive : null]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 18,
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
