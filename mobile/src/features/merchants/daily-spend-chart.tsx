import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatAmount } from '@/features/spending-overview/formatting';
import { bubbleTints, overviewColors } from '@/features/spending-overview/overview-theme';

import type { SpendBucket } from './merchant-summary';

interface DailySpendChartProps {
  buckets: SpendBucket[];
  currency: string;
  selectedKey: string | null;
  onSelect: (key: string | null) => void;
}

const plotHeight = 132;
const axisBand = 16;
const maximumTicks = 5;

/** Which x labels to draw: the ends plus evenly spaced ones, so they never collide. */
function tickIndexes(count: number): Set<number> {
  if (count <= maximumTicks) {
    return new Set(Array.from({ length: count }, (_, index) => index));
  }

  const step = (count - 1) / (maximumTicks - 1);

  return new Set(
    Array.from({ length: maximumTicks }, (_, index) => Math.round(index * step)),
  );
}

/**
 * One series, so one colour for every bar — colouring each bar by its own height would
 * re-encode the length that is already the whole point of a bar. Emphasis is reserved for
 * the bar the reader picked, and the value is read out once above the plot rather than
 * stamped on every bar.
 */
function DailySpendChartComponent({
  buckets,
  currency,
  selectedKey,
  onSelect,
}: DailySpendChartProps) {
  if (buckets.length === 0) {
    return null;
  }

  const peak = buckets.reduce(
    (highest, bucket) => (bucket.totalMinor > highest.totalMinor ? bucket : highest),
    buckets[0],
  );
  const highlighted = buckets.find((bucket) => bucket.key === selectedKey) ?? peak;
  const ticks = tickIndexes(buckets.length);
  const tint = bubbleTints.expense;

  return (
    <View style={styles.chart}>
      <View style={styles.caption}>
        <Text maxFontSizeMultiplier={1.5} style={styles.captionLabel}>
          {highlighted.key === peak.key && selectedKey === null ? 'Najwięcej' : 'Wybrany okres'} ·{' '}
          {highlighted.spokenLabel}
        </Text>
        <Text maxFontSizeMultiplier={1.5} style={styles.captionValue}>
          {formatAmount(highlighted.totalMinor, currency)}
        </Text>
      </View>

      <View accessibilityRole="summary" style={[styles.plot, { height: plotHeight }]}>
        {buckets.map((bucket) => {
          const isHighlighted = bucket.key === highlighted.key;
          const ratio = peak.totalMinor === 0 ? 0 : bucket.totalMinor / peak.totalMinor;

          return (
            <Pressable
              accessibilityLabel={`${bucket.spokenLabel}: ${formatAmount(bucket.totalMinor, currency)}`}
              accessibilityRole="button"
              accessibilityState={{ selected: bucket.key === selectedKey }}
              key={bucket.key}
              onPress={() => onSelect(bucket.key === selectedKey ? null : bucket.key)}
              style={styles.column}
            >
              <View
                style={[
                  styles.bar,
                  {
                    height: Math.max(ratio * plotHeight, bucket.totalMinor > 0 ? 3 : 0),
                    backgroundColor: tint.film,
                    opacity: isHighlighted ? 1 : 0.55,
                  },
                ]}
              />
            </Pressable>
          );
        })}
      </View>

      <View style={styles.baseline} />

      <View style={[styles.axis, { height: axisBand }]}>
        {buckets.map((bucket, index) => (
          <View key={bucket.key} style={styles.axisSlot}>
            {ticks.has(index) ? (
              <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={styles.axisLabel}>
                {bucket.label}
              </Text>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

export const DailySpendChart = memo(DailySpendChartComponent);

const styles = StyleSheet.create({
  chart: {
    gap: 10,
  },
  caption: {
    gap: 2,
  },
  captionLabel: {
    fontSize: 12,
    color: overviewColors.textSecondary,
  },
  captionValue: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.4,
    color: overviewColors.textPrimary,
  },
  plot: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    /** The 2px surface gap the marks need, instead of borders around them. */
    gap: 2,
  },
  column: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    /** Rounded at the data end only; the other end is anchored to the baseline. */
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  baseline: {
    height: StyleSheet.hairlineWidth,
    marginTop: -10,
    backgroundColor: overviewColors.hairline,
  },
  axis: {
    flexDirection: 'row',
    gap: 2,
  },
  axisSlot: {
    flex: 1,
    alignItems: 'center',
  },
  axisLabel: {
    fontSize: 10,
    color: overviewColors.textSecondary,
  },
});
