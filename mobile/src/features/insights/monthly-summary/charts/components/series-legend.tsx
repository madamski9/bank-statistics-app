import { StyleSheet, Text, View } from 'react-native';

import { overviewColors } from '@/features/app-shell/theme/overview-theme';

import type { DailyCategorySeries } from '../../monthly-summary';
import { reportSeriesColors } from '../report-colors';

export function SeriesLegend({ series }: { series: DailyCategorySeries[] }) {
  return (
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
  );
}

const styles = StyleSheet.create({
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 6, paddingTop: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5, maxWidth: '48%' },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { flexShrink: 1, fontSize: 12, color: overviewColors.textSecondary },
});
