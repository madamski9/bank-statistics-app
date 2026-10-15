import { StyleSheet, View, type TextStyle } from 'react-native';
import Animated, { type AnimatedStyle } from 'react-native-reanimated';

import { overviewColors } from '@/features/app-shell/theme/overview-theme';
import { reportingCurrency } from '@/features/data/currency-conversion/exchange-rate';
import { AmountText } from '@/features/settings/privacy/amounts/amount-text';
import { useAmountFormatting } from '@/features/settings/privacy/amounts/use-private-amounts';

export const valueAxisWidth = 52;

interface ValueAxisProps {
  plotHeight: number;
  peakMinor: number;
  averageMinor: number;
  averageOffset: number;
  averageLabel: string;
  averageLabelStyle: AnimatedStyle<TextStyle>;
}

export function ValueAxis({
  plotHeight,
  peakMinor,
  averageMinor,
  averageOffset,
  averageLabel,
  averageLabelStyle,
}: ValueAxisProps) {
  const { formatCompactAmount } = useAmountFormatting();
  const valueTicks = [plotHeight, plotHeight / 2].filter(
    (offset) => averageMinor <= 0 || Math.abs(offset - averageOffset) >= 14,
  );

  return (
    <View style={[styles.valueAxis, { height: plotHeight }]}>
      {valueTicks.map((offset) => (
        <AmountText
          adjustsFontSizeToFit
          key={offset}
          maxFontSizeMultiplier={1.1}
          numberOfLines={1}
          style={[styles.valueLabel, { bottom: offset - 7 }]}
        >
          {formatCompactAmount(Math.round((offset / plotHeight) * peakMinor), reportingCurrency)}
        </AmountText>
      ))}
      {averageMinor > 0 ? (
        <Animated.Text
          maxFontSizeMultiplier={1.1}
          numberOfLines={1}
          style={[styles.valueLabel, styles.averageLabel, { bottom: averageOffset - 7 }, averageLabelStyle]}
        >
          {averageLabel}
        </Animated.Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  valueAxis: { width: valueAxisWidth },
  valueLabel: {
    position: 'absolute',
    left: 0,
    right: 0,
    fontSize: 10,
    lineHeight: 14,
    color: overviewColors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  averageLabel: { fontWeight: '700', color: overviewColors.positive },
});
