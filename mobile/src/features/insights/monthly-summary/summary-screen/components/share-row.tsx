import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { ScalePressable } from '@/features/app-shell/motion/scale-pressable';
import { overviewColors, overviewSpacing } from '@/features/app-shell/theme/overview-theme';
import type { SpendingGroup } from '@/features/data/classification/spending-groups';
import { AmountText } from '@/features/settings/privacy/amounts/amount-text';

import { GrowingFill } from '../../charts/growing-fill';

interface ShareRowProps {
  group: SpendingGroup;
  index: number;
  fraction: number;
  value: string;
  detail: string;
  tint: string;
  isActive: boolean;
  accessibilityHint: string;
  onPress: () => void;
}

export function ShareRow({ group, index, fraction, value, detail, tint, isActive, accessibilityHint, onPress }: ShareRowProps) {
  return (
    <ScalePressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={`${group.name}, ${value}, ${detail}`}
      accessibilityRole="button"
      onPress={onPress}
      pressedScale={0.98}
      style={styles.shareRow}
    >
      <View style={[styles.shareIcon, { backgroundColor: tint }]}>
        <Text maxFontSizeMultiplier={1.2} style={styles.shareIconText}>
          {group.name.charAt(0).toLocaleUpperCase()}
        </Text>
      </View>
      <View style={styles.shareBody}>
        <View style={styles.shareHeading}>
          <Text maxFontSizeMultiplier={1.4} numberOfLines={1} style={styles.shareName}>
            {group.name}
          </Text>
          <AmountText maxFontSizeMultiplier={1.4} style={styles.shareValue}>
            {value}
          </AmountText>
        </View>
        <View style={styles.shareTrack}>
          <GrowingFill
            color={tint}
            delayMs={120 + index * 50}
            fraction={Math.max(fraction, 0.02)}
            isActive={isActive}
            style={styles.shareFill}
          />
        </View>
        <Text maxFontSizeMultiplier={1.4} style={styles.shareDetail}>
          {detail}
        </Text>
      </View>
      <SymbolView
        accessibilityElementsHidden
        importantForAccessibility="no"
        name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
        size={14}
        tintColor={overviewColors.textSecondary}
      />
    </ScalePressable>
  );
}

const styles = StyleSheet.create({
  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: overviewSpacing.row,
    minHeight: 44,
  },
  shareIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
  },
  shareIconText: {
    fontSize: 19,
    fontWeight: '700',
    color: overviewColors.background,
  },
  shareBody: {
    flex: 1,
    gap: 7,
  },
  shareHeading: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
  },
  shareName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: overviewColors.textPrimary,
  },
  shareValue: {
    fontSize: 15,
    fontWeight: '600',
    color: overviewColors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  shareTrack: {
    height: 6,
    overflow: 'hidden',
    borderRadius: 3,
    backgroundColor: overviewColors.surfacePressed,
  },
  shareFill: {
    borderRadius: 3,
  },
  shareDetail: {
    fontSize: 12,
    color: overviewColors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
});
