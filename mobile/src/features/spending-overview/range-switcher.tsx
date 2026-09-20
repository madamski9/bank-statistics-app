import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { selectionChanged } from '@/haptics';

import { overviewColors } from './overview-theme';
import { periodOptions, type SpendingPeriod } from './periods';

interface RangeSwitcherProps {
  period: SpendingPeriod;
  onChange: (period: SpendingPeriod) => void;
}

/** The five ranges from the issue: week, month, three months, year, all-time. */
export function RangeSwitcher({ period, onChange }: RangeSwitcherProps) {
  return (
    <View accessibilityRole="tablist" style={styles.row}>
      {periodOptions.map((option) => {
        const isSelected = option.value === period;

        return (
          <Pressable
            accessibilityLabel={option.label}
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
            style={({ pressed }) => [styles.tab, pressed ? styles.pressed : null]}
          >
            <Animated.Text
              maxFontSizeMultiplier={1.4}
              style={[
                styles.label,
                isSelected ? styles.labelSelected : null,
                {
                  transitionProperty: 'color',
                  transitionDuration: '180ms',
                  transitionTimingFunction: 'ease-out',
                },
              ]}
            >
              {option.short}
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
  },
  tab: {
    minHeight: 44,
    minWidth: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  pressed: {
    opacity: 0.6,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
    color: overviewColors.textSecondary,
  },
  labelSelected: {
    fontWeight: '700',
    color: overviewColors.textPrimary,
  },
});
