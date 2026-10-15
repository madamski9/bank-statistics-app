import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useCopy } from '@/features/app-shell/localization/language';
import { overviewColors } from '@/features/app-shell/theme/overview-theme';
import { selectionChanged } from '@/haptics';

import { transactionsCopy } from '../../transactions-copy';
import type { TransactionDirection } from '../manual-transaction';

const directionOrder: TransactionDirection[] = ['expense', 'income'];

interface DirectionSwitcherProps {
  direction: TransactionDirection;
  onChange: (direction: TransactionDirection) => void;
}

export function DirectionSwitcher({ direction, onChange }: DirectionSwitcherProps) {
  const copy = useCopy(transactionsCopy);

  return (
    <View accessibilityRole="tablist" style={styles.directions}>
      {directionOrder.map((value) => {
        const isActive = value === direction;

        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            key={value}
            onPress={() => {
              selectionChanged();
              onChange(value);
            }}
            style={[styles.direction, isActive ? styles.directionActive : null]}
          >
            <Text
              maxFontSizeMultiplier={1.3}
              style={[styles.directionLabel, isActive ? styles.directionLabelActive : null]}
            >
              {copy.directions[value]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  directions: {
    flexDirection: 'row',
    gap: 6,
    padding: 4,
    borderRadius: 14,
    backgroundColor: overviewColors.surface,
  },
  direction: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
  },
  directionActive: {
    backgroundColor: overviewColors.surfacePressed,
  },
  directionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: overviewColors.textSecondary,
  },
  directionLabelActive: {
    color: overviewColors.textPrimary,
  },
});
