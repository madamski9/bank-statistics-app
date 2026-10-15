import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { overviewColors, overviewSpacing } from '@/features/app-shell/theme/overview-theme';
import { AmountText } from '@/features/settings/privacy/amounts/amount-text';

interface SheetSectionProps {
  label?: string;
  footnote?: string | null;
  children: ReactNode;
}

export function SheetSection({ label, footnote, children }: SheetSectionProps) {
  return (
    <View style={styles.section}>
      {label !== undefined ? (
        <AmountText maxFontSizeMultiplier={1.4} style={styles.sectionLabel}>
          {label.toLocaleUpperCase()}
        </AmountText>
      ) : null}
      <View style={styles.card}>{children}</View>
      {footnote !== undefined && footnote !== null ? (
        <Text maxFontSizeMultiplier={1.5} style={styles.footnote}>
          {footnote}
        </Text>
      ) : null}
    </View>
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
  footnote: {
    fontSize: 13,
    lineHeight: 18,
    color: overviewColors.textSecondary,
  },
});
