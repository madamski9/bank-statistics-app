import { StyleSheet, View } from 'react-native';

import { overviewColors } from '@/features/app-shell/theme/overview-theme';
import { AmountText } from '@/features/settings/privacy/amounts/amount-text';

import type { TrendPoint } from '../../../spending/spending-trend';

const centeredTickWidth = 72;

function tickIndexes(count: number): number[] {
  if (count <= 1) {
    return count === 1 ? [0] : [];
  }

  return [...new Set([0, Math.floor((count - 1) / 2), count - 1])];
}

export function ChartAxis({ points }: { points: TrendPoint[] }) {
  return (
    <View style={styles.axis}>
      {tickIndexes(points.length).map((index) => {
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
  );
}

const styles = StyleSheet.create({
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
