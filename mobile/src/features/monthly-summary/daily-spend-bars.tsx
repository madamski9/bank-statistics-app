import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { reportingCurrency } from '@/features/currency-conversion/exchange-rate';
import { AmountText } from '@/features/privacy/amount-text';
import { useAmountFormatting } from '@/features/privacy/use-private-amounts';
import { overviewColors } from '@/features/spending-overview/overview-theme';
import { selectionChanged } from '@/haptics';

import type { DailyCategorySeries } from './monthly-summary';
import { reportSeriesColors } from './report-colors';

const plotHeight = 176;
const minimumBarHeight = 3;
const barStaggerMs = 14;
const barSpring = { duration: 520, dampingRatio: 0.82, reduceMotion: ReduceMotion.System };

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

interface StackedBarProps {
  index: number;
  isActive: boolean;
  height: number;
  segments: { key: string; fraction: number; color: string }[];
}

function StackedBar({ index, isActive, height, segments }: StackedBarProps) {
  const growth = useSharedValue(0);

  useEffect(() => {
    if (!isActive) {
      growth.set(0);
      return;
    }

    growth.set(withDelay(index * barStaggerMs, withSpring(1, barSpring)));
  }, [growth, index, isActive]);

  const growthStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: growth.get() }],
  }));

  return (
    <Animated.View style={[styles.stack, { height }, growthStyle]}>
      {segments.map((segment) => (
        <View
          key={segment.key}
          style={{ height: `${segment.fraction * 100}%`, backgroundColor: segment.color }}
        />
      ))}
    </Animated.View>
  );
}

function axisDaysFor(dayCount: number): number[] {
  return [1, 8, 15, 22, dayCount].filter((day, position, days) =>
    position === days.length - 1 || dayCount - day >= 4,
  );
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
  const { formatCompactAmount } = useAmountFormatting();
  const mainSeries = dailyCategories.slice(0, 3);
  const remaining = dailyCategories.slice(3);
  const series = remaining.length === 0
    ? mainSeries
    : [
        ...mainSeries,
        {
          key: 'other',
          name: otherLabel,
          totalMinor: remaining.reduce((total, group) => total + group.totalMinor, 0),
          dailyMinor: dailyExpensesMinor.map((_, day) =>
            remaining.reduce((total, group) => total + (group.dailyMinor[day] ?? 0), 0),
          ),
        },
      ];
  const peakMinor = Math.max(...dailyExpensesMinor, averageMinor, 1);
  const averageOffset = (averageMinor / peakMinor) * plotHeight;
  const dayCount = dailyExpensesMinor.length;
  const axisDays = axisDaysFor(dayCount);
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
  const valueTicks = [plotHeight, plotHeight / 2].filter(
    (offset) => averageMinor <= 0 || Math.abs(offset - averageOffset) >= 14,
  );

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
              const isFuture = index >= elapsedDays;

              if (isFuture || totalMinor === 0) {
                return <View key={index} style={styles.column} />;
              }

              const height = Math.max((totalMinor / peakMinor) * plotHeight, minimumBarHeight);
              const segments = series
                .map((group, seriesIndex) => ({
                  key: group.key,
                  fraction: (group.dailyMinor[index] ?? 0) / totalMinor,
                  color: reportSeriesColors[seriesIndex] ?? overviewColors.textSecondary,
                }))
                .filter((segment) => segment.fraction > 0);

              const day = index + 1;
              const isDimmed = selectedDay !== null && selectedDay !== day;
              const bar = (
                <View style={[styles.barSlot, isDimmed ? styles.dimmed : null]}>
                  <StackedBar height={height} index={index} isActive={isActive} segments={segments} />
                </View>
              );

              if (onSelectDay === undefined) {
                return (
                  <View key={index} style={styles.column}>
                    {bar}
                  </View>
                );
              }

              return (
                <Pressable
                  accessibilityLabel={barAccessibilityLabel?.(day, totalMinor)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: selectedDay === day }}
                  key={index}
                  onPress={() => {
                    selectionChanged();
                    onSelectDay(selectedDay === day ? null : day);
                  }}
                  style={styles.column}
                >
                  {bar}
                </Pressable>
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
        <View style={styles.valueAxis}>
          {valueTicks.map((offset) => (
            <AmountText
              adjustsFontSizeToFit
              key={offset}
              maxFontSizeMultiplier={1.1}
              numberOfLines={1}
              style={[styles.valueLabel, { bottom: offset - 7 }]}
            >
              {formatCompactAmount(Math.round((offset / plotHeight) * peakMinor), reportingCurrency)}
            </AmountText>
          ))}
          {averageMinor > 0 ? (
            <Animated.Text
              maxFontSizeMultiplier={1.1}
              numberOfLines={1}
              style={[styles.valueLabel, styles.averageLabel, { bottom: averageOffset - 7 }, averageLabelStyle]}
            >
              {averageLabel}
            </Animated.Text>
          ) : null}
        </View>
      </View>
      <View style={styles.dayAxis}>
        {axisDays.map((day) => (
          <Text
            key={day}
            maxFontSizeMultiplier={1.2}
            numberOfLines={1}
            style={[styles.dayLabel, { left: `${((day - 0.5) / Math.max(dayCount, 1)) * 100}%` }]}
          >
            {day}
          </Text>
        ))}
      </View>
      <View style={styles.legend}>
        {series.map((group, index) => (
          <View key={group.key} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: reportSeriesColors[index] }]} />
            <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={styles.legendLabel}>
              {group.name}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const valueAxisWidth = 52;
const dayLabelWidth = 28;

const styles = StyleSheet.create({
  chart: { gap: 8 },
  plotRow: { flexDirection: 'row', gap: 8 },
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
  column: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  barSlot: { width: '100%' },
  dimmed: { opacity: 0.3 },
  stack: {
    width: '100%',
    flexDirection: 'column-reverse',
    overflow: 'hidden',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    transformOrigin: 'bottom',
  },
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
  valueAxis: { width: valueAxisWidth, height: plotHeight },
  valueLabel: {
    position: 'absolute',
    left: 0,
    right: 0,
    fontSize: 10,
    lineHeight: 14,
    color: overviewColors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  averageLabel: { fontWeight: '700', color: overviewColors.positive },
  dayAxis: { marginRight: valueAxisWidth + 8, height: 14 },
  dayLabel: {
    position: 'absolute',
    width: dayLabelWidth,
    marginLeft: -dayLabelWidth / 2,
    textAlign: 'center',
    fontSize: 10,
    color: overviewColors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 6, paddingTop: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5, maxWidth: '48%' },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { flexShrink: 1, fontSize: 12, color: overviewColors.textSecondary },
});
