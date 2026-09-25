import { memo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BubbleField, type BubbleDescriptor } from '@/features/spending-overview/bubble-field';
import { useAmountFormatting } from '@/features/privacy/use-private-amounts';
import { formatChange, formatTransactionCount } from '@/features/spending-overview/formatting';
import type { BubbleOrigin } from '@/features/spending-overview/glass-bubble';
import {
  overviewColors,
  overviewSpacing,
  type BubbleKey,
} from '@/features/spending-overview/overview-theme';
import { periodOption, type SpendingPeriod } from '@/features/spending-overview/periods';
import { RangeSwitcher } from '@/features/spending-overview/range-switcher';
import type { SpendingSummary } from '@/features/spending-overview/spending-summary';

import { SpendingRhythmCard } from './spending-rhythm-card';
import { rhythmPeak, type ExpenseRhythm } from './spending-rhythm';

const unavailableValue = '-';

interface OverviewScreenProps {
  summary: SpendingSummary;
  rhythm: ExpenseRhythm;
  expenseChange: number | null;
  period: SpendingPeriod;
  onChangePeriod: (period: SpendingPeriod) => void;
  lockedPeriods: ReadonlySet<SpendingPeriod>;
  onSelectBubble: (key: BubbleKey, origin: BubbleOrigin) => void;
  error: string | null;
  isLoading: boolean;
  hasData: boolean;
}

function OverviewScreenComponent({
  summary,
  rhythm,
  expenseChange,
  period,
  onChangePeriod,
  lockedPeriods,
  onSelectBubble,
  error,
  isLoading,
  hasData,
}: OverviewScreenProps) {
  const { formatAmount, formatCompactAmount, formatSignedCompactAmount } = useAmountFormatting();
  const insets = useSafeAreaInsets();
  const option = periodOption(period);

  const amount = (minor: number, compact: boolean, signed = false) => {
    if (!hasData && isLoading) {
      return unavailableValue;
    }

    if (signed) {
      return formatSignedCompactAmount(minor, summary.currency);
    }

    return compact
      ? formatCompactAmount(minor, summary.currency)
      : formatAmount(minor, summary.currency);
  };

  const bubbles: BubbleDescriptor[] = [
    {
      key: 'expense',
      label: 'Wydatki',
      value: amount(summary.expenseMinor, false),
      caption: formatTransactionCount(summary.expenseCount),
      accessibilityLabel: `Wydatki, ${amount(summary.expenseMinor, false)}, ${option.label}, ${formatTransactionCount(summary.expenseCount)}`,
    },
    {
      key: 'income',
      label: 'Przychody',
      value: amount(summary.incomeMinor, true),
      accessibilityLabel: `Przychody, ${amount(summary.incomeMinor, true)}, ${option.label}`,
    },
    {
      key: 'net',
      label: 'Przepływ',
      value: amount(summary.netMinor, true, true),
      accessibilityLabel: `Przepływ, przychody minus wydatki, ${amount(summary.netMinor, true, true)}, ${option.label}`,
    },
  ];

  const bucketSize = rhythm.size;
  const peak = rhythmPeak(rhythm.buckets);
  const peakLabels = { day: 'Maks. / dzień', week: 'Maks. / tydz.', month: 'Maks. / mies.' };
  const stats = [
    { key: 'count', label: 'Transakcje', value: String(summary.expenseCount + summary.incomeCount) },
    {
      key: 'peak',
      label: peakLabels[bucketSize],
      value: peak === null ? unavailableValue : amount(peak.totalMinor, true),
    },
    {
      key: 'largest',
      label: 'Top źródło',
      value: summary.largestExpense?.label ?? unavailableValue,
    },
  ];

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <View style={styles.contextRow}>
          <Text maxFontSizeMultiplier={1.6} style={styles.contextLabel}>
            Wydatki · {option.label}
          </Text>
          {expenseChange !== null ? (
            <Text
              maxFontSizeMultiplier={1.6}
              style={[
                styles.contextChange,
                { color: expenseChange < 0 ? overviewColors.positive : overviewColors.negative },
              ]}
            >
              {expenseChange >= 0 ? '▲' : '▼'} {formatChange(expenseChange)} vs{' '}
              {option.previousLabel}
            </Text>
          ) : null}
        </View>

        <RangeSwitcher lockedPeriods={lockedPeriods} onChange={onChangePeriod} period={period} />
      </View>

      <BubbleField bubbles={bubbles} onSelect={onSelectBubble} />

      {error !== null ? (
        <Text maxFontSizeMultiplier={1.6} style={styles.error}>
          {error}
        </Text>
      ) : Platform.OS !== 'ios' ? (
        <Text maxFontSizeMultiplier={1.6} style={styles.hint}>
          Przechwytywanie powiadomień działa na razie tylko na iOS.
        </Text>
      ) : !hasData && !isLoading ? (
        <Text maxFontSizeMultiplier={1.6} style={styles.hint}>
          Nie przechwycono jeszcze żadnej transakcji. Skonfiguruj automatyzację powiadomień w
          aplikacji Skróty.
        </Text>
      ) : null}

      <View style={{ paddingBottom: insets.bottom + 16 }}>
        <SpendingRhythmCard
          bucketSize={bucketSize}
          buckets={rhythm.buckets}
          formatAverage={(minor) => amount(minor, true)}
          stats={stats}
        />
      </View>
    </View>
  );
}

/** Memoised so a selection or a page change never rebuilds the bubble field. */
export const OverviewScreen = memo(OverviewScreenComponent);

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  header: {
    paddingHorizontal: overviewSpacing.gutter,
    gap: overviewSpacing.tight,
  },
  contextRow: {
    gap: 2,
  },
  contextLabel: {
    fontSize: 13,
    color: overviewColors.textSecondary,
  },
  contextChange: {
    fontSize: 13,
    fontWeight: '600',
  },
  hint: {
    paddingHorizontal: overviewSpacing.gutter,
    paddingBottom: overviewSpacing.row,
    fontSize: 14,
    lineHeight: 20,
    color: overviewColors.textSecondary,
  },
  error: {
    paddingHorizontal: overviewSpacing.gutter,
    paddingBottom: overviewSpacing.row,
    fontSize: 13,
    color: overviewColors.negative,
  },
});
