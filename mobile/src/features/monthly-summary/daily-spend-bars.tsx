import { StyleSheet, Text, View } from 'react-native';

import { bubbleTints, overviewColors } from '@/features/spending-overview/overview-theme';

const plotHeight = 120;
const minimumBarHeight = 3;
const labelledDays = [1, 8, 15, 22, 29];

interface DailySpendBarsProps {
  dailyExpensesMinor: number[];
  elapsedDays: number;
  averageMinor: number;
  averageLabel: string;
  accessibilityLabel: string;
}

export function DailySpendBars({
  dailyExpensesMinor,
  elapsedDays,
  averageMinor,
  averageLabel,
  accessibilityLabel,
}: DailySpendBarsProps) {
  const peakMinor = Math.max(...dailyExpensesMinor, averageMinor, 1);
  const averageOffset = (averageMinor / peakMinor) * plotHeight;

  return (
    <View accessibilityLabel={accessibilityLabel} accessible style={styles.chart}>
      <View style={styles.plot}>
        {[0.5, 1].map((fraction) => (
          <View key={fraction} style={[styles.gridLine, { bottom: fraction * plotHeight }]} />
        ))}
        <View style={styles.bars}>
          {dailyExpensesMinor.map((totalMinor, index) => {
            const isFuture = index >= elapsedDays;

            return (
              <View key={index} style={styles.column}>
                <View
                  style={[
                    styles.bar,
                    isFuture
                      ? styles.futureBar
                      : totalMinor > 0
                        ? {
                            height: Math.max((totalMinor / peakMinor) * plotHeight, minimumBarHeight),
                            backgroundColor: bubbleTints.expense.film,
                          }
                        : styles.emptyBar,
                  ]}
                />
              </View>
            );
          })}
        </View>
        {averageMinor > 0 ? (
          <View pointerEvents="none" style={[styles.averageLine, { bottom: averageOffset }]}>
            <View style={styles.averageDash} />
            <Text maxFontSizeMultiplier={1.2} style={styles.averageLabel}>
              {averageLabel}
            </Text>
          </View>
        ) : null}
      </View>
      <View style={styles.axis}>
        {dailyExpensesMinor.map((_, index) => (
          <View key={index} style={styles.column}>
            {labelledDays.includes(index + 1) ? (
              <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={styles.axisLabel}>
                {index + 1}
              </Text>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chart: {
    gap: 6,
  },
  plot: {
    height: plotHeight,
    justifyContent: 'flex-end',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: overviewColors.hairline,
  },
  bars: {
    height: '100%',
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  column: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
    overflow: 'visible',
  },
  bar: {
    width: '100%',
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  emptyBar: {
    height: minimumBarHeight,
    backgroundColor: overviewColors.surfacePressed,
  },
  futureBar: {
    height: minimumBarHeight,
    backgroundColor: overviewColors.surface,
  },
  averageLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    transform: [{ translateY: 7 }],
  },
  averageDash: {
    flex: 1,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: overviewColors.positive,
  },
  averageLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: overviewColors.positive,
  },
  axis: {
    height: 14,
    flexDirection: 'row',
    gap: 2,
  },
  axisLabel: {
    width: 24,
    fontSize: 11,
    color: overviewColors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
});
