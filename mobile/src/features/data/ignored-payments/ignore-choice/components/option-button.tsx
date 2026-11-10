import { SymbolView } from 'expo-symbols';
import type { ComponentProps } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';

import type { PlatformSymbol } from '@/features/app-shell/symbols/platform-symbol';
import { ScalePressable } from '@/features/app-shell/motion/scale-pressable';
import { overviewColors, overviewSpacing } from '@/features/app-shell/theme/overview-theme';

interface OptionButtonProps {
  label: string;
  labelKey?: string;
  detail: string;
  symbol: PlatformSymbol;
  tone?: 'default' | 'danger';
  disabled: boolean;
  isBusy: boolean;
  animatedStyle?: ComponentProps<typeof Animated.View>['style'];
  onPress: () => void;
}

export function OptionButton({
  label,
  labelKey = 'idle',
  detail,
  symbol,
  tone = 'default',
  disabled,
  isBusy,
  animatedStyle,
  onPress,
}: OptionButtonProps) {
  const isDanger = tone === 'danger';
  const tint = isDanger ? overviewColors.negative : overviewColors.textPrimary;

  return (
    <ScalePressable
      accessibilityHint={detail}
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled, busy: isBusy }}
      disabled={disabled}
      onPress={onPress}
      pressedScale={0.97}
    >
      <Animated.View style={[styles.option, isDanger ? styles.optionDanger : null, animatedStyle]}>
        <View accessibilityElementsHidden importantForAccessibility="no" style={styles.optionIcon}>
          {isBusy ? (
            <ActivityIndicator color={tint} />
          ) : (
            <SymbolView name={symbol} size={19} tintColor={tint} weight="semibold" />
          )}
        </View>
        <Animated.View
          entering={labelKey === 'idle' ? undefined : FadeIn.duration(180).reduceMotion(ReduceMotion.System)}
          key={labelKey}
          style={styles.optionCopy}
        >
          <Text maxFontSizeMultiplier={1.4} style={[styles.optionLabel, { color: tint }]}>
            {label}
          </Text>
          <Text maxFontSizeMultiplier={1.4} style={styles.optionDetail}>
            {detail}
          </Text>
        </Animated.View>
      </Animated.View>
    </ScalePressable>
  );
}

const styles = StyleSheet.create({
  option: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: overviewSpacing.row,
    paddingHorizontal: overviewSpacing.block,
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: overviewColors.hairline,
    backgroundColor: overviewColors.surfacePressed,
  },
  optionDanger: {
    borderWidth: 1,
  },
  optionIcon: {
    width: 28,
    alignItems: 'center',
  },
  optionCopy: {
    flex: 1,
    gap: 3,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  optionDetail: {
    fontSize: 13,
    lineHeight: 18,
    color: overviewColors.textSecondary,
  },
});
