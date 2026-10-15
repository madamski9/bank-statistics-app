import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { ScalePressable } from '@/features/app-shell/motion/scale-pressable';
import { overviewColors, overviewSpacing } from '@/features/app-shell/theme/overview-theme';
import { AmountText } from '@/features/settings/privacy/amounts/amount-text';
import { selectionChanged } from '@/haptics';

interface HighlightTileProps {
  label: string;
  value: string;
  detail?: string;
  accessibilityHint: string;
  onPress: () => void;
}

export function HighlightTile({ label, value, detail, accessibilityHint, onPress }: HighlightTileProps) {
  return (
    <ScalePressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={`${label}: ${value}${detail === undefined ? '' : `, ${detail}`}`}
      accessibilityRole="button"
      containerStyle={styles.highlightContainer}
      onPress={() => {
        selectionChanged();
        onPress();
      }}
      pressedScale={0.96}
      style={styles.highlight}
    >
      <View style={styles.highlightHeader}>
        <AmountText maxFontSizeMultiplier={1.4} numberOfLines={1} style={styles.highlightLabel}>
          {label}
        </AmountText>
        <SymbolView
          accessibilityElementsHidden
          importantForAccessibility="no"
          name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
          size={11}
          tintColor={overviewColors.textDisabled}
        />
      </View>
      <AmountText adjustsFontSizeToFit maxFontSizeMultiplier={1.3} numberOfLines={1} style={styles.highlightValue}>
        {value}
      </AmountText>
      {detail !== undefined ? (
        <Text maxFontSizeMultiplier={1.4} numberOfLines={1} style={styles.highlightDetail}>
          {detail}
        </Text>
      ) : null}
    </ScalePressable>
  );
}

const styles = StyleSheet.create({
  highlightContainer: {
    flexGrow: 1,
    flexBasis: '45%',
  },
  highlightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  highlight: {
    gap: 4,
    padding: overviewSpacing.block,
    borderRadius: 18,
    backgroundColor: overviewColors.surface,
  },
  highlightLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: overviewColors.textSecondary,
  },
  highlightValue: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: overviewColors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  highlightDetail: {
    fontSize: 12,
    color: overviewColors.textSecondary,
  },
});
