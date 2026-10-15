import * as Haptics from 'expo-haptics';
import { memo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { useCopy } from '@/features/app-shell/localization/language';
import { overviewColors } from '@/features/app-shell/theme/overview-theme';
import { AmountText } from '@/features/settings/privacy/amounts/amount-text';
import { useAmountFormatting } from '@/features/settings/privacy/amounts/use-private-amounts';

import { merchantsCopy } from '../../merchants-copy';
import type { SpendBucket } from '../merchant-summary';
import { SpendBucketAxis } from './spend-bucket-axis';
import { SpendBucketBar } from './spend-bucket-bar';

interface DailySpendChartProps {
  buckets: SpendBucket[];
  currency: string;
  selectedKey: string | null;
  onSelect: (key: string | null) => void;
}

const plotHeight = 132;

function DailySpendChartComponent({
  buckets,
  currency,
  selectedKey,
  onSelect,
}: DailySpendChartProps) {
  const { formatAmount } = useAmountFormatting();
  const copy = useCopy(merchantsCopy);
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

  const peak = buckets.reduce(
    (highest, bucket) => (bucket.totalMinor > highest.totalMinor ? bucket : highest),
    buckets[0],
  );
  const highlighted = buckets.find((bucket) => bucket.key === selectedKey) ?? peak;

  return (
    <View style={styles.chart}>
      <View style={styles.caption}>
        <AmountText maxFontSizeMultiplier={1.5} style={styles.captionLabel}>
          {highlighted.key === peak.key && selectedKey === null ? copy.highest : copy.selected} ·{' '}
          {highlighted.spokenLabel}
        </AmountText>
        <AmountText maxFontSizeMultiplier={1.5} style={styles.captionValue}>
          {formatAmount(highlighted.totalMinor, currency)}
        </AmountText>
      </View>

      <GestureDetector gesture={Gesture.Race(scrub, tap)}>
        <View
          accessibilityRole="summary"
          onLayout={(event) => setPlotWidth(event.nativeEvent.layout.width)}
          style={[styles.plot, { height: plotHeight }]}
        >
          {buckets.map((bucket) => (
            <SpendBucketBar
              accessibilityLabel={`${bucket.spokenLabel}: ${formatAmount(bucket.totalMinor, currency)}`}
              height={plotHeight}
              isEmpty={bucket.totalMinor <= 0}
              isHighlighted={bucket.key === highlighted.key}
              isSelected={bucket.key === selectedKey}
              key={bucket.key}
              onToggle={() => onSelect(bucket.key === selectedKey ? null : bucket.key)}
              ratio={peak.totalMinor === 0 ? 0 : bucket.totalMinor / peak.totalMinor}
            />
          ))}
        </View>
      </GestureDetector>

      <SpendBucketAxis buckets={buckets} />
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
    gap: 2,
  },
});
