import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';

import { useCopy } from '@/features/localization/language';
import { AmountText } from '@/features/privacy/amount-text';

import { chartPoints, nearestIndex, smoothAreaPath, smoothLinePath } from './area-chart-geometry';
import { overviewColors } from './overview-theme';
import { spendingOverviewCopy } from './spending-overview-copy';
import type { TrendPoint } from './spending-trend';

export interface AreaSeries {
  key: string;
  label: string;
  color: string;
  values: number[];
}

interface AreaChartProps {
  points: TrendPoint[];
  series: AreaSeries[];
  formatValue: (minor: number) => string;
  height?: number;
}

const topInset = 12;
const gridLines = [0.25, 0.5, 0.75];
const centeredTickWidth = 72;

function tickIndexes(count: number): number[] {
  if (count <= 1) {
    return count === 1 ? [0] : [];
  }

  return [...new Set([0, Math.floor((count - 1) / 2), count - 1])];
}

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
  const activeX = activeIndex === null ? null : plotted[0]?.coordinates[activeIndex]?.x;
  const ticks = tickIndexes(points.length);

  return (
    <View style={styles.chart}>
      <View accessibilityLiveRegion="polite" style={styles.readout}>
        {readoutIndex === null ? (
          <View style={styles.legend}>
            {series.map((entry) => (
              <View key={entry.key} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: entry.color }]} />
                <AmountText maxFontSizeMultiplier={1.4} style={styles.legendLabel}>
                  {entry.label}
                </AmountText>
              </View>
            ))}
          </View>
        ) : (
          <>
            <AmountText maxFontSizeMultiplier={1.4} style={styles.readoutDate}>
              {activeIndex === null ? copy.chartPeak : ''}
              {points[readoutIndex].spokenLabel}
            </AmountText>
            <View style={styles.readoutValues}>
              {series.map((entry) => (
                <View key={entry.key} style={styles.legendItem}>
                  {series.length > 1 ? (
                    <View style={[styles.legendDot, { backgroundColor: entry.color }]} />
                  ) : null}
                  <AmountText maxFontSizeMultiplier={1.4} style={styles.readoutValue}>
                    {formatValue(entry.values[readoutIndex])}
                  </AmountText>
                </View>
              ))}
            </View>
          </>
        )}
      </View>

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
            <Svg height={height} width={width}>
              <Defs>
                {series.map((entry) => (
                  <LinearGradient id={`fill-${entry.key}`} key={entry.key} x1="0" x2="0" y1="0" y2="1">
                    <Stop offset="0" stopColor={entry.color} stopOpacity={0.42} />
                    <Stop offset="1" stopColor={entry.color} stopOpacity={0.02} />
                  </LinearGradient>
                ))}
              </Defs>
              {gridLines.map((fraction) => (
                <Line
                  key={fraction}
                  stroke={overviewColors.textPrimary}
                  strokeOpacity={0.07}
                  strokeWidth={1}
                  x1={0}
                  x2={width}
                  y1={topInset + (height - topInset) * fraction}
                  y2={topInset + (height - topInset) * fraction}
                />
              ))}
              {plotted.map((entry) => (
                <Path d={smoothAreaPath(entry.coordinates, height)} fill={`url(#fill-${entry.key})`} key={`area-${entry.key}`} />
              ))}
              {plotted.map((entry) => (
                <Path
                  d={smoothLinePath(entry.coordinates)}
                  fill="none"
                  key={`line-${entry.key}`}
                  stroke={entry.color}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              ))}
              {activeX == null ? null : (
                <Line
                  stroke={overviewColors.textPrimary}
                  strokeOpacity={0.35}
                  strokeWidth={1}
                  x1={activeX}
                  x2={activeX}
                  y1={0}
                  y2={height}
                />
              )}
              {activeIndex === null
                ? null
                : plotted.map((entry) => (
                    <Circle
                      cx={entry.coordinates[activeIndex].x}
                      cy={entry.coordinates[activeIndex].y}
                      fill={entry.color}
                      key={`dot-${entry.key}`}
                      r={4.5}
                      stroke={overviewColors.background}
                      strokeWidth={2}
                    />
                  ))}
            </Svg>
          ) : null}
        </View>
      </GestureDetector>

      <View style={styles.axis}>
        {ticks.map((index) => {
          const isFirst = index === 0;
          const isLast = index === points.length - 1;

          return (
            <View
              key={points[index].key}
              style={[
                styles.tick,
                isFirst
                  ? styles.tickStart
                  : isLast
                    ? styles.tickEnd
                    : {
                        left: `${(index / (points.length - 1)) * 100}%`,
                        width: centeredTickWidth,
                        marginLeft: -centeredTickWidth / 2,
                        alignItems: 'center',
                      },
              ]}
            >
              <AmountText maxFontSizeMultiplier={1.3} numberOfLines={1} style={styles.axisLabel}>
                {points[index].label}
              </AmountText>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chart: {
    gap: 12,
  },
  readout: {
    minHeight: 44,
    justifyContent: 'flex-end',
    gap: 2,
  },
  readoutDate: {
    fontSize: 12,
    color: overviewColors.textSecondary,
  },
  readoutValues: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  readoutValue: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.4,
    color: overviewColors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  legend: {
    flexDirection: 'row',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  legendLabel: {
    fontSize: 13,
    color: overviewColors.textSecondary,
  },
  axis: {
    height: 16,
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
