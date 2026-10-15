import { StyleSheet, View } from 'react-native';

import { useCopy } from '@/features/app-shell/localization/language';
import { overviewColors } from '@/features/app-shell/theme/overview-theme';
import { AmountText } from '@/features/settings/privacy/amounts/amount-text';

import { spendingOverviewCopy } from '../../../spending-overview-copy';
import type { TrendPoint } from '../../../spending/spending-trend';
import type { AreaSeries } from '../area-series';

interface ChartReadoutProps {
  points: TrendPoint[];
  series: AreaSeries[];
  readoutIndex: number | null;
  isScrubbing: boolean;
  formatValue: (minor: number) => string;
}

export function ChartReadout({ points, series, readoutIndex, isScrubbing, formatValue }: ChartReadoutProps) {
  const copy = useCopy(spendingOverviewCopy);

  return (
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
            {isScrubbing ? '' : copy.chartPeak}
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
  );
}

const styles = StyleSheet.create({
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
});
