import { StyleSheet, View } from 'react-native';

import { overviewColors } from '@/features/app-shell/theme/overview-theme';
import { AmountText } from '@/features/settings/privacy/amounts/amount-text';

import type { SpendBucket } from '../merchant-summary';

const axisBand = 16;
const centeredTickWidth = 64;

function tickIndexes(count: number): number[] {
  if (count <= 1) {
    return count === 1 ? [0] : [];
  }

  return [...new Set([0, Math.floor((count - 1) / 2), count - 1])];
}

export function SpendBucketAxis({ buckets }: { buckets: SpendBucket[] }) {
  return (
    <View style={[styles.axis, { height: axisBand }]}>
      {tickIndexes(buckets.length).map((index) => {
        const bucket = buckets[index];
        const isFirst = index === 0;
        const isLast = index === buckets.length - 1;

        return (
          <View
            key={bucket.key}
            style={[
              styles.tick,
              isFirst
                ? styles.tickStart
                : isLast
                  ? styles.tickEnd
                  : {
                      left: `${((index + 0.5) / buckets.length) * 100}%`,
                      width: centeredTickWidth,
                      marginLeft: -centeredTickWidth / 2,
                      alignItems: 'center',
                    },
            ]}
          >
            <AmountText maxFontSizeMultiplier={1.3} numberOfLines={1} style={styles.axisLabel}>
              {bucket.label}
            </AmountText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  axis: {
    marginTop: -4,
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
