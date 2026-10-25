import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useCopy } from '@/features/app-shell/localization/language';
import { overviewColors } from '@/features/app-shell/theme/overview-theme';
import { DailySpendChart } from '@/features/home/merchants/merchant-detail/components/daily-spend-chart';
import { AmountText } from '@/features/settings/privacy/amounts/amount-text';
import { useAmountFormatting } from '@/features/settings/privacy/amounts/use-private-amounts';

import { transactionsCopy } from '../../transactions-copy';
import { shownBucketKey, type BucketChoice, type MerchantSpendHistory } from '../merchant-spend-history';

export function MerchantHistoryChart({ history }: { history: MerchantSpendHistory }) {
  const copy = useCopy(transactionsCopy);
  const { formatAmount } = useAmountFormatting();
  const [choice, setChoice] = useState<BucketChoice>(null);
  const summary = copy.merchantHistorySummary(formatAmount(history.totalMinor, history.currency), history.count);

  return (
    <View style={styles.section}>
      <View accessible accessibilityLabel={`${copy.merchantHistoryTitle}, ${history.merchantName}. ${summary}`}>
        <Text maxFontSizeMultiplier={1.4} style={styles.title}>
          {copy.merchantHistoryTitle}
        </Text>
        <AmountText maxFontSizeMultiplier={1.4} style={styles.summary}>
          {summary}
        </AmountText>
      </View>
      <DailySpendChart
        buckets={history.buckets}
        currency={history.currency}
        onSelect={(key) => setChoice({ key })}
        selectedKey={shownBucketKey(history, choice)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: overviewColors.hairline,
    backgroundColor: overviewColors.surface,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: overviewColors.textPrimary,
  },
  summary: {
    marginTop: 2,
    fontSize: 13,
    color: overviewColors.textSecondary,
  },
});
