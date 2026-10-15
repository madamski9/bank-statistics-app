import { StyleSheet, View } from 'react-native';

import { bubbleTints, overviewColors } from '@/features/app-shell/theme/overview-theme';

interface SpendBucketBarProps {
  accessibilityLabel: string;
  height: number;
  ratio: number;
  isEmpty: boolean;
  isHighlighted: boolean;
  isSelected: boolean;
  onToggle: () => void;
}

export function SpendBucketBar({
  accessibilityLabel,
  height,
  ratio,
  isEmpty,
  isHighlighted,
  isSelected,
  onToggle,
}: SpendBucketBarProps) {
  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      accessible
      onAccessibilityTap={onToggle}
      style={styles.column}
    >
      <View
        style={[
          styles.bar,
          isEmpty
            ? styles.emptyBar
            : {
                height: Math.max(ratio * height, 3),
                backgroundColor: bubbleTints.expense.film,
                opacity: isHighlighted ? 1 : 0.55,
              },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  column: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  emptyBar: {
    height: 2,
    borderRadius: 1,
    backgroundColor: overviewColors.textDisabled,
  },
});
