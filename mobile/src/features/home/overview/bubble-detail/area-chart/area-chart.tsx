import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { useCopy } from '@/features/app-shell/localization/language';

import { spendingOverviewCopy } from '../../spending-overview-copy';
import type { TrendPoint } from '../../spending/spending-trend';
import { chartPoints, nearestIndex } from './area-chart-geometry';
import type { AreaSeries } from './area-series';
import { ChartAxis } from './components/chart-axis';
import { ChartPlot } from './components/chart-plot';
import { ChartReadout } from './components/chart-readout';

export type { AreaSeries } from './area-series';

interface AreaChartProps {
  points: TrendPoint[];
  series: AreaSeries[];
  formatValue: (minor: number) => string;
  height?: number;
}

const topInset = 12;

export function AreaChart({ points, series, formatValue, height = 168 }: AreaChartProps) {
  const copy = useCopy(spendingOverviewCopy);
  const [width, setWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (points.length < 2) {
    return null;
  }

  const maximum = Math.max(0, ...series.flatMap((entry) => entry.values));
  const plotted = series.map((entry) => ({
    ...entry,
    coordinates: chartPoints(entry.values, { width, height, maximum, topInset }),
  }));
  const peakIndex = series.length === 1 ? series[0].values.indexOf(Math.max(...series[0].values)) : -1;

  const select = (x: number) => {
    const next = nearestIndex(x, width, points.length);

    if (next === activeIndex) {
      return;
    }

    void Haptics.selectionAsync();
    setActiveIndex(next);
  };

  const scrub = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetX([-6, 6])
    .failOffsetY([-10, 10])
    .onStart((event) => select(event.x))
    .onUpdate((event) => select(event.x))
    .onFinalize(() => setActiveIndex(null));

  const tap = Gesture.Tap()
    .runOnJS(true)
    .onEnd((event, success) => {
      if (!success) {
        return;
      }

      const next = nearestIndex(event.x, width, points.length);

      setActiveIndex(next === activeIndex ? null : next);
    });

  const readoutIndex = activeIndex ?? (peakIndex >= 0 && maximum > 0 ? peakIndex : null);

  return (
    <View style={styles.chart}>
      <ChartReadout
        formatValue={formatValue}
        isScrubbing={activeIndex !== null}
        points={points}
        readoutIndex={readoutIndex}
        series={series}
      />

      <GestureDetector gesture={Gesture.Race(scrub, tap)}>
        <View
          accessibilityLabel={copy.chartLabel(
            series.map((entry) => entry.label),
            points[0].spokenLabel,
            points[points.length - 1].spokenLabel,
          )}
          accessible
          onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
          style={{ height }}
        >
          {width > 0 ? (
            <ChartPlot activeIndex={activeIndex} height={height} plotted={plotted} topInset={topInset} width={width} />
          ) : null}
        </View>
      </GestureDetector>

      <ChartAxis points={points} />
    </View>
  );
}

const styles = StyleSheet.create({
  chart: {
    gap: 12,
  },
});
