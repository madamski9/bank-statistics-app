import { StyleSheet, Text, View } from 'react-native';

import { useCopy } from '@/features/app-shell/localization/language';
import { overviewColors } from '@/features/app-shell/theme/overview-theme';
import { AmountText } from '@/features/settings/privacy/amounts/amount-text';
import { useAmountFormatting } from '@/features/settings/privacy/amounts/use-private-amounts';

import { spendingOverviewCopy } from '../../spending-overview-copy';
import type { SpendingSummary } from '../../spending/spending-summary';

export function NetBreakdown({ summary }: { summary: SpendingSummary }) {
  const copy = useCopy(spendingOverviewCopy);
  const { formatAmount, formatSignedAmount } = useAmountFormatting();
  const { titles } = copy;

  return (
    <View style={styles.netBlock}>
      <Text maxFontSizeMultiplier={1.6} style={styles.explainer}>
        {copy.netExplainer}
      </Text>
      <NetRow
        amount={formatAmount(summary.incomeMinor, summary.currency)}
        color={overviewColors.positive}
        label={titles.income}
      />
      <NetRow
        amount={`− ${formatAmount(summary.expenseMinor, summary.currency)}`}
        color={overviewColors.negative}
        label={titles.expense}
      />
      <View style={styles.divider} />
      <NetRow
        amount={formatSignedAmount(summary.netMinor, summary.currency)}
        color={
          summary.netMinor < 0 ? overviewColors.negative : overviewColors.positive
        }
        label={titles.net}
      />
    </View>
  );
}

function NetRow({ label, amount, color }: { label: string; amount: string; color: string }) {
  return (
    <View accessible accessibilityLabel={`${label}: ${amount}`} style={styles.netRow}>
      <AmountText maxFontSizeMultiplier={1.6} style={styles.netLabel}>
        {label}
      </AmountText>
      <AmountText maxFontSizeMultiplier={1.6} style={[styles.netAmount, { color }]}>
        {amount}
      </AmountText>
    </View>
  );
}

const styles = StyleSheet.create({
  netBlock: {
    gap: 14,
  },
  explainer: {
    fontSize: 14,
    lineHeight: 20,
    color: overviewColors.textSecondary,
  },
  netRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  netLabel: {
    fontSize: 15,
    color: overviewColors.textPrimary,
  },
  netAmount: {
    fontSize: 17,
    fontWeight: '600',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: overviewColors.hairline,
  },
});
