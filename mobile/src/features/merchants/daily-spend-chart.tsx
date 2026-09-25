import * as Haptics from 'expo-haptics';
import { memo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { useAmountFormatting } from '@/features/privacy/use-private-amounts';
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
const centeredTickWidth = 64;

function tickIndexes(count: number): number[] {
  if (count <= 1) {
    return count === 1 ? [0] : [];
  }

  return [...new Set([0, Math.floor((count - 1) / 2), count - 1])];
}

/**
 * One series, so one colour for every bar - colouring each bar by its own height would
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
  const { formatAmount } = useAmountFormatting();
  const [plotWidth, setPlotWidth] = useState(0);

  if (buckets.length === 0) {
    return null;
  }

  const bucketAt = (x: number) => {
    const index = Math.floor((x / Math.max(plotWidth, 1)) * buckets.length);

    return buckets[Math.min(Math.max(index, 0), buckets.length - 1)];
  };

  const scrubTo = (x: number) => {
    const bucket = bucketAt(x);

    if (bucket.key === selectedKey) {
      return;
    }

    void Haptics.selectionAsync();
    onSelect(bucket.key);
  };

  const tap = Gesture.Tap()
    .runOnJS(true)
    .onEnd((event, success) => {
      if (!success) {
        return;
      }

      const bucket = bucketAt(event.x);

      onSelect(bucket.key === selectedKey ? null : bucket.key);
    });

  const scrub = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetX([-6, 6])
    .failOffsetY([-10, 10])
    .onStart((event) => scrubTo(event.x))
    .onUpdate((event) => scrubTo(event.x));

  const plotGesture = Gesture.Race(scrub, tap);

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

      <GestureDetector gesture={plotGesture}>
        <View
          accessibilityRole="summary"
          onLayout={(event) => setPlotWidth(event.nativeEvent.layout.width)}
          style={[styles.plot, { height: plotHeight }]}
        >
          {buckets.map((bucket) => {
            const isHighlighted = bucket.key === highlighted.key;
            const ratio = peak.totalMinor === 0 ? 0 : bucket.totalMinor / peak.totalMinor;

            return (
              <View
                accessibilityLabel={`${bucket.spokenLabel}: ${formatAmount(bucket.totalMinor, currency)}`}
                accessibilityRole="button"
                accessibilityState={{ selected: bucket.key === selectedKey }}
                accessible
                key={bucket.key}
                onAccessibilityTap={() => onSelect(bucket.key === selectedKey ? null : bucket.key)}
                style={styles.column}
              >
                <View
                  style={[
                    styles.bar,
                    bucket.totalMinor > 0
                      ? {
                          height: Math.max(ratio * plotHeight, 3),
                          backgroundColor: tint.film,
                          opacity: isHighlighted ? 1 : 0.55,
                        }
                      : styles.emptyBar,
                  ]}
                />
              </View>
            );
          })}
        </View>
      </GestureDetector>

      <View style={[styles.axis, { height: axisBand }]}>
        {ticks.map((index) => {
          const bucket = buckets[index];
          const isFirst = index === 0;
          const isLast = index === buckets.length - 1;

          return (
            <View
              key={bucket.key}
              style={[
                styles.tick,
                isFirst
                  ? styles.tickStart
                  : isLast
                    ? styles.tickEnd
                    : {
                        left: `${((index + 0.5) / buckets.length) * 100}%`,
                        width: centeredTickWidth,
                        marginLeft: -centeredTickWidth / 2,
                        alignItems: 'center',
                      },
              ]}
            >
              <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={styles.axisLabel}>
                {bucket.label}
              </Text>
            </View>
          );
        })}
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
  emptyBar: {
    height: 2,
    borderRadius: 1,
    backgroundColor: overviewColors.textDisabled,
  },
  axis: {
    marginTop: -4,
  },
  tick: {
    position: 'absolute',
    top: 0,
  },
  tickStart: {
    left: 0,
  },
  tickEnd: {
    right: 0,
  },
  axisLabel: {
    fontSize: 11,
    color: overviewColors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
});
