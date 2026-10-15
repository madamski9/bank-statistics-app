import { StyleSheet, Text, View } from 'react-native';

import { overviewColors } from '@/features/app-shell/theme/overview-theme';
import { AmountText } from '@/features/settings/privacy/amounts/amount-text';

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

interface BubbleLabelProps {
  size: number;
  label: string;
  value: string;
  caption?: string;
}

export function BubbleLabel({ size, label, value, caption }: BubbleLabelProps) {
  const valueFontSize = clamp(size * 0.145, 13, 34);
  const labelFontSize = clamp(size * 0.056, 10, 13);

  return (
    <View style={[styles.content, { paddingHorizontal: size * 0.14 }]}>
      <AmountText
        maxFontSizeMultiplier={1.2}
        numberOfLines={1}
        style={[styles.label, { fontSize: labelFontSize }]}
      >
        {label}
      </AmountText>
      <AmountText
        adjustsFontSizeToFit
        maxFontSizeMultiplier={1.2}
        minimumFontScale={0.7}
        numberOfLines={1}
        style={[styles.value, { fontSize: valueFontSize }]}
      >
        {value}
      </AmountText>
      {caption !== undefined ? (
        <Text
          maxFontSizeMultiplier={1.2}
          numberOfLines={1}
          style={[styles.caption, { fontSize: labelFontSize * 0.92 }]}
        >
          {caption}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  label: {
    fontWeight: '600',
    letterSpacing: 0.2,
    color: overviewColors.textSecondary,
  },
  value: {
    fontWeight: '700',
    letterSpacing: -0.6,
    color: overviewColors.textPrimary,
  },
  caption: {
    fontWeight: '500',
    color: overviewColors.textSecondary,
  },
});
