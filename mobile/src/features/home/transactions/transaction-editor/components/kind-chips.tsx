import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { useCopy } from '@/features/app-shell/localization/language';
import { transactionsCopy } from '../../transactions-copy';

import { overviewColors } from '@/features/app-shell/theme/overview-theme';
import { selectionChanged } from '@/haptics';

import { transactionKindOptions, type TransactionDirection, type TransactionKind } from '../manual-transaction';

interface KindChipsProps {
  direction: TransactionDirection;
  kind: TransactionKind;
  onChange: (kind: TransactionKind) => void;
}

export function KindChips({ direction, kind, onChange }: KindChipsProps) {
  const copy = useCopy(transactionsCopy);
  return (
    <View style={styles.kinds}>
      {transactionKindOptions(direction).map((option) => {
        const isActive = option.value === kind;

        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            key={option.value}
            onPress={() => {
              selectionChanged();
              onChange(option.value);
            }}
            style={({ pressed }) => [
              styles.kind,
              isActive ? styles.kindActive : null,
              pressed ? styles.pressed : null,
            ]}
          >
            <Text
              maxFontSizeMultiplier={1.3}
              style={[styles.kindLabel, isActive ? styles.kindLabelActive : null]}
            >
              {Platform.OS === 'android' && option.value === 'cardPayment' ? copy.types.cardPayment : option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  kinds: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  kind: {
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 17,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: overviewColors.hairline,
    backgroundColor: overviewColors.surface,
  },
  kindActive: {
    borderColor: 'rgba(255, 255, 255, 0.24)',
    backgroundColor: overviewColors.surfacePressed,
  },
  kindLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: overviewColors.textSecondary,
  },
  kindLabelActive: {
    color: overviewColors.textPrimary,
  },
  pressed: {
    opacity: 0.6,
  },
});
