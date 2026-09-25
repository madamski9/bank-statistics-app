import { StyleSheet, Text, View } from 'react-native';

import type { BucketSize, SpendBucket } from '@/features/merchants/merchant-summary';
import { bubbleTints, overviewColors, overviewSpacing } from '@/features/spending-overview/overview-theme';

import { rhythmAverageMinor } from './spending-rhythm';

const plotHeight = 64;
const emptyBarHeight = 2;

const averageLabels: Record<BucketSize, string> = {
  day: 'Średnio dziennie',
  week: 'Średnio na tydzień',
  month: 'Średnio na miesiąc',
};

interface RhythmStat {
  key: string;
  label: string;
  value: string;
}

interface SpendingRhythmCardProps {
  buckets: SpendBucket[];
  bucketSize: BucketSize;
  stats: RhythmStat[];
  formatAverage: (minor: number) => string;
}

export function SpendingRhythmCard({ buckets, bucketSize, stats, formatAverage }: SpendingRhythmCardProps) {
  const peakMinor = buckets.reduce((highest, bucket) => Math.max(highest, bucket.totalMinor), 0);
  const averageMinor = rhythmAverageMinor(buckets);
  const hasBars = peakMinor > 0;
  const tint = bubbleTints.expense.film;

  return (
    <View style={styles.container}>
      <View style={styles.body}>
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={styles.chart}
        >
          <View style={[styles.plot, { height: plotHeight }]}>
            {buckets.map((bucket) => (
              <View key={bucket.key} style={styles.column}>
                <View
                  style={[
                    styles.bar,
                    bucket.totalMinor > 0
                      ? {
                          height: Math.max((bucket.totalMinor / peakMinor) * plotHeight, 4),
                          backgroundColor: tint,
                          opacity: bucket.totalMinor === peakMinor ? 1 : 0.45,
                        }
                      : styles.emptyBar,
                  ]}
                />
              </View>
            ))}
          </View>
          {buckets.length > 1 ? (
            <View style={styles.axis}>
              <Text maxFontSizeMultiplier={1.3} style={styles.axisLabel}>
                {buckets[0].label}
              </Text>
              <Text maxFontSizeMultiplier={1.3} style={styles.axisLabel}>
                {buckets[buckets.length - 1].label}
              </Text>
            </View>
          ) : null}
        </View>

        {hasBars ? (
          <View
            accessible
            accessibilityLabel={`${averageLabels[bucketSize]}: ${formatAverage(averageMinor)}`}
            style={styles.average}
          >
            <Text maxFontSizeMultiplier={1.4} style={styles.statLabel}>
              {averageLabels[bucketSize]}
            </Text>
            <Text maxFontSizeMultiplier={1.4} numberOfLines={1} style={styles.averageValue}>
              {formatAverage(averageMinor)}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.stats}>
        {stats.map((stat) => (
          <View
            accessible
            accessibilityLabel={`${stat.label}: ${stat.value}`}
            key={stat.key}
            style={styles.stat}
          >
            <Text maxFontSizeMultiplier={1.4} numberOfLines={1} style={styles.statLabel}>
              {stat.label}
            </Text>
            <Text maxFontSizeMultiplier={1.4} numberOfLines={1} style={styles.statValue}>
              {stat.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: overviewSpacing.gutter,
    gap: overviewSpacing.block,
  },
  body: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: overviewSpacing.section,
  },
  chart: {
    flex: 1,
  },
  average: {
    gap: 4,
    paddingBottom: 18,
  },
  averageValue: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: overviewColors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  plot: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  column: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  emptyBar: {
    height: emptyBarHeight,
    borderRadius: 1,
    backgroundColor: overviewColors.textDisabled,
  },
  axis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  axisLabel: {
    fontSize: 11,
    color: overviewColors.textDisabled,
    fontVariant: ['tabular-nums'],
  },
  stats: {
    flexDirection: 'row',
    gap: overviewSpacing.row,
  },
  stat: {
    flex: 1,
    gap: 4,
  },
  statLabel: {
    fontSize: 12,
    color: overviewColors.textSecondary,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.3,
    color: overviewColors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
});
