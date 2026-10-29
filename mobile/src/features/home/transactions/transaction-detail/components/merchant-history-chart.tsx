import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useCopy } from '@/features/app-shell/localization/language';
import { overviewColors } from '@/features/app-shell/theme/overview-theme';
import { DailySpendChart } from '@/features/home/merchants/merchant-detail/components/daily-spend-chart';
import { periodLabel } from '@/features/home/overview/period/periods';
import { RangeSwitcher } from '@/features/home/overview/period/range-switcher';
import { AmountText } from '@/features/settings/privacy/amounts/amount-text';
import { useAmountFormatting } from '@/features/settings/privacy/amounts/use-private-amounts';

import { transactionsCopy } from '../../transactions-copy';
import {
  chartPeriods,
  shownBucketKey,
  type BucketChoice,
  type ChartPeriod,
  type MerchantSpendHistory,
} from '../merchant-spend-history';

interface MerchantHistoryChartProps {
  history: MerchantSpendHistory;
  period: ChartPeriod;
  onChangePeriod: (period: ChartPeriod) => void;
}

function isChartPeriod(period: string): period is ChartPeriod {
  return chartPeriods.some((candidate) => candidate === period);
}

export function MerchantHistoryChart({ history, period, onChangePeriod }: MerchantHistoryChartProps) {
  const copy = useCopy(transactionsCopy);
  const { formatAmount } = useAmountFormatting();
  const [choice, setChoice] = useState<BucketChoice>(null);
  const summary = copy.merchantHistorySummary(formatAmount(history.totalMinor, history.currency), history.count);

  return (
    <View style={styles.section}>
      <View accessible accessibilityLabel={`${copy.merchantHistoryTitle}, ${history.merchantName}, ${periodLabel(period)}. ${summary}`}>
        <Text maxFontSizeMultiplier={1.4} style={styles.title}>
          {copy.merchantHistoryTitle}
        </Text>
        <AmountText maxFontSizeMultiplier={1.4} style={styles.summary}>
          {summary}
        </AmountText>
      </View>
      <RangeSwitcher
        onChange={(next) => {
          if (isChartPeriod(next)) {
            onChangePeriod(next);
          }
        }}
        period={period}
        periods={chartPeriods}
      />
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
