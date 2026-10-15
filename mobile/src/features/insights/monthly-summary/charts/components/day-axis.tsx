import { StyleSheet, Text, View } from 'react-native';

import { overviewColors } from '@/features/app-shell/theme/overview-theme';

import { axisDaysFor } from '../daily-series';

const dayLabelWidth = 28;

interface DayAxisProps {
  dayCount: number;
  trailingInset: number;
}

export function DayAxis({ dayCount, trailingInset }: DayAxisProps) {
  return (
    <View style={[styles.dayAxis, { marginRight: trailingInset }]}>
      {axisDaysFor(dayCount).map((day) => (
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
  );
}

const styles = StyleSheet.create({
  dayAxis: { height: 14 },
  dayLabel: {
    position: 'absolute',
    width: dayLabelWidth,
    marginLeft: -dayLabelWidth / 2,
    textAlign: 'center',
    fontSize: 10,
    color: overviewColors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
});
