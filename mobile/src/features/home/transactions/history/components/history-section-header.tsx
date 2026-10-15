import { StyleSheet, Text, View } from 'react-native';

import { overviewColors, overviewSpacing } from '@/features/app-shell/theme/overview-theme';
import { AmountText } from '@/features/settings/privacy/amounts/amount-text';
import { useAmountFormatting } from '@/features/settings/privacy/amounts/use-private-amounts';

import type { DaySection } from '../history-sections';

export function HistorySectionHeader({ section }: { section: DaySection }) {
  const { formatAmount } = useAmountFormatting();

  return (
    <View style={styles.sectionHeader}>
      <Text maxFontSizeMultiplier={1.6} style={styles.sectionTitle}>
        {section.title}
      </Text>
      {section.currency === null ? null : (
        <AmountText maxFontSizeMultiplier={1.6} style={styles.sectionTotal}>
          {section.totalMinor < 0 ? '−' : '+'}
          {formatAmount(section.totalMinor, section.currency)}
        </AmountText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: overviewSpacing.block,
    paddingBottom: overviewSpacing.tight,
    backgroundColor: overviewColors.background,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: overviewColors.textPrimary,
  },
  sectionTotal: {
    fontSize: 13,
    color: overviewColors.textSecondary,
  },
});
