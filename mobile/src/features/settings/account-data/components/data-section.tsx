import { SymbolView } from 'expo-symbols';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { PlatformSymbol } from '@/features/app-shell/symbols/platform-symbol';
import { overviewColors, overviewSpacing } from '@/features/app-shell/theme/overview-theme';

interface DataSectionProps {
  label: string;
  footnote?: string;
  children: ReactNode;
}

export function DataSection({ label, footnote, children }: DataSectionProps) {
  return (
    <View style={styles.section}>
      <Text maxFontSizeMultiplier={1.4} style={styles.sectionLabel}>
        {label}
      </Text>
      <View style={styles.card}>{children}</View>
      {footnote !== undefined ? (
        <Text maxFontSizeMultiplier={1.5} style={styles.footnote}>
          {footnote}
        </Text>
      ) : null}
    </View>
  );
}

interface DataRowProps {
  label: string;
  symbol?: PlatformSymbol;
  tone?: 'default' | 'danger';
  accessibilityHint?: string;
  onPress: () => void;
}

export function DataRow({ label, symbol, tone = 'default', accessibilityHint, onPress }: DataRowProps) {
  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed ? styles.rowPressed : null]}
    >
      <Text maxFontSizeMultiplier={1.4} style={tone === 'danger' ? styles.dangerLabel : styles.rowLabel}>
        {label}
      </Text>
      {symbol !== undefined ? (
        <SymbolView
          accessibilityElementsHidden
          importantForAccessibility="no"
          name={symbol}
          size={17}
          tintColor={overviewColors.textSecondary}
        />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: overviewSpacing.tight,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.6,
    color: overviewColors.textSecondary,
  },
  card: {
    overflow: 'hidden',
    borderRadius: 18,
    backgroundColor: overviewColors.surface,
  },
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: overviewSpacing.block,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: overviewColors.hairline,
  },
  rowPressed: {
    backgroundColor: overviewColors.surfacePressed,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: overviewColors.textPrimary,
  },
  dangerLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: overviewColors.negative,
  },
  footnote: {
    fontSize: 13,
    lineHeight: 18,
    color: overviewColors.textSecondary,
  },
});
