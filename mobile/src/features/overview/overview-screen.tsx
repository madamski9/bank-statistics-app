import { memo } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BubbleField, type BubbleDescriptor } from '@/features/spending-overview/bubble-field';
import {
  formatAmount,
  formatChange,
  formatCompactAmount,
  formatSignedCompactAmount,
  formatTransactionCount,
} from '@/features/spending-overview/formatting';
import type { BubbleOrigin } from '@/features/spending-overview/glass-bubble';
import {
  overviewColors,
  overviewSpacing,
  type BubbleKey,
} from '@/features/spending-overview/overview-theme';
import { periodOption, type SpendingPeriod } from '@/features/spending-overview/periods';
import { RangeSwitcher } from '@/features/spending-overview/range-switcher';
import type { SpendingSummary } from '@/features/spending-overview/spending-summary';

const unavailableValue = '—';

interface OverviewScreenProps {
  summary: SpendingSummary;
  expenseChange: number | null;
  period: SpendingPeriod;
  onChangePeriod: (period: SpendingPeriod) => void;
  onSelectBubble: (key: BubbleKey, origin: BubbleOrigin) => void;
  error: string | null;
  isLoading: boolean;
  hasData: boolean;
}

function OverviewScreenComponent({
  summary,
  expenseChange,
  period,
  onChangePeriod,
  onSelectBubble,
  error,
  isLoading,
  hasData,
}: OverviewScreenProps) {
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

  const tiles = [
    { key: 'count', label: 'Transakcje', value: String(summary.expenseCount + summary.incomeCount) },
    { key: 'daily', label: 'Średnio dziennie', value: amount(summary.dailyExpenseMinor, true) },
    {
      key: 'largest',
      label: 'Największe źródło',
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

        <RangeSwitcher onChange={onChangePeriod} period={period} />
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

      <ScrollView
        contentContainerStyle={[styles.tileRow, { paddingBottom: insets.bottom + 16 }]}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tileScroll}
      >
        {tiles.map((tile) => (
          <View
            accessible
            accessibilityLabel={`${tile.label}: ${tile.value}`}
            key={tile.key}
            style={styles.tile}
          >
            <Text maxFontSizeMultiplier={1.6} style={styles.tileLabel}>
              {tile.label}
            </Text>
            <Text maxFontSizeMultiplier={1.6} numberOfLines={1} style={styles.tileValue}>
              {tile.value}
            </Text>
          </View>
        ))}
      </ScrollView>
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
  tileScroll: {
    flexGrow: 0,
  },
  tileRow: {
    gap: overviewSpacing.row,
    paddingHorizontal: overviewSpacing.gutter,
  },
  tile: {
    minWidth: 138,
    gap: 6,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: overviewColors.surface,
  },
  tileLabel: {
    fontSize: 13,
    color: overviewColors.textSecondary,
  },
  tileValue: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.3,
    color: overviewColors.textPrimary,
  },
});
