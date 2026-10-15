import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { overviewColors } from '@/features/app-shell/theme/overview-theme';

import type { DailyCategorySeries } from '../monthly-summary';
import { DayAxis } from './components/day-axis';
import { DayColumn, EmptyDayColumn } from './components/day-column';
import { SeriesLegend } from './components/series-legend';
import { barStaggerMs } from './components/stacked-bar';
import { ValueAxis, valueAxisWidth } from './components/value-axis';
import { chartSeries } from './daily-series';
import { reportSeriesColors } from './report-colors';

const plotHeight = 176;
const minimumBarHeight = 3;
const plotGap = 8;

interface DailySpendBarsProps {
  dailyExpensesMinor: number[];
  dailyCategories: DailyCategorySeries[];
  elapsedDays: number;
  averageMinor: number;
  averageLabel: string;
  otherLabel: string;
  accessibilityLabel: string;
  isActive?: boolean;
  selectedDay?: number | null;
  onSelectDay?: (day: number | null) => void;
  barAccessibilityLabel?: (day: number, totalMinor: number) => string;
}

export function DailySpendBars({
  dailyExpensesMinor,
  dailyCategories,
  elapsedDays,
  averageMinor,
  averageLabel,
  otherLabel,
  accessibilityLabel,
  isActive = true,
  selectedDay = null,
  onSelectDay,
  barAccessibilityLabel,
}: DailySpendBarsProps) {
  const series = chartSeries(dailyCategories, dailyExpensesMinor, otherLabel);
  const peakMinor = Math.max(...dailyExpensesMinor, averageMinor, 1);
  const averageOffset = (averageMinor / peakMinor) * plotHeight;
  const dayCount = dailyExpensesMinor.length;
  const averageReveal = useSharedValue(0);

  useEffect(() => {
    averageReveal.set(0);

    if (!isActive) {
      return;
    }

    averageReveal.set(
      withDelay(
        Math.min(dayCount * barStaggerMs, 420) + 120,
        withTiming(1, { duration: 320, reduceMotion: ReduceMotion.System }),
      ),
    );
  }, [averageReveal, averageMinor, dayCount, isActive]);

  const averageStyle = useAnimatedStyle(() => ({
    opacity: averageReveal.get(),
    transform: [{ scaleX: averageReveal.get() }],
  }));

  const averageLabelStyle = useAnimatedStyle(() => ({
    opacity: averageReveal.get(),
  }));

  const isSelectable = onSelectDay !== undefined;

  return (
    <View
      accessibilityLabel={isSelectable ? undefined : accessibilityLabel}
      accessible={!isSelectable}
      style={styles.chart}
    >
      <View style={styles.plotRow}>
        <View style={styles.plot}>
          <View style={[styles.gridLine, { bottom: plotHeight }]} />
          <View style={[styles.gridLine, { bottom: plotHeight / 2 }]} />
          <View style={[styles.baseline, { bottom: 0 }]} />
          <View style={styles.bars}>
            {dailyExpensesMinor.map((totalMinor, index) => {
              if (index >= elapsedDays || totalMinor === 0) {
                return <EmptyDayColumn key={index} />;
              }

              return (
                <DayColumn
                  accessibilityLabel={barAccessibilityLabel?.(index + 1, totalMinor)}
                  height={Math.max((totalMinor / peakMinor) * plotHeight, minimumBarHeight)}
                  index={index}
                  isActive={isActive}
                  key={index}
                  onSelectDay={onSelectDay}
                  segments={series
                    .map((group, seriesIndex) => ({
                      key: group.key,
                      fraction: (group.dailyMinor[index] ?? 0) / totalMinor,
                      color: reportSeriesColors[seriesIndex] ?? overviewColors.textSecondary,
                    }))
                    .filter((segment) => segment.fraction > 0)}
                  selectedDay={selectedDay}
                />
              );
            })}
          </View>
          {averageMinor > 0 ? (
            <Animated.View
              pointerEvents="none"
              style={[styles.averageLine, { bottom: averageOffset }, averageStyle]}
            >
              <View style={styles.averageDash} />
            </Animated.View>
          ) : null}
        </View>
        <ValueAxis
          averageLabel={averageLabel}
          averageLabelStyle={averageLabelStyle}
          averageMinor={averageMinor}
          averageOffset={averageOffset}
          peakMinor={peakMinor}
          plotHeight={plotHeight}
        />
      </View>
      <DayAxis dayCount={dayCount} trailingInset={valueAxisWidth + plotGap} />
      <SeriesLegend series={series} />
    </View>
  );
}

const styles = StyleSheet.create({
  chart: { gap: 8 },
  plotRow: { flexDirection: 'row', gap: plotGap },
  plot: { flex: 1, height: plotHeight, justifyContent: 'flex-end' },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: overviewColors.hairline,
  },
  baseline: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: overviewColors.textDisabled,
  },
  bars: { height: '100%', flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  averageLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    transformOrigin: 'left',
  },
  averageDash: {
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: overviewColors.positive,
  },
});
