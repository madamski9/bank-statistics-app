import { Pressable, StyleSheet, View } from 'react-native';

import { selectionChanged } from '@/haptics';

import { StackedBar, type BarSegment } from './stacked-bar';

interface DayColumnProps {
  index: number;
  height: number;
  segments: BarSegment[];
  isActive: boolean;
  selectedDay: number | null;
  accessibilityLabel?: string;
  onSelectDay?: (day: number | null) => void;
}

export function DayColumn({
  index,
  height,
  segments,
  isActive,
  selectedDay,
  accessibilityLabel,
  onSelectDay,
}: DayColumnProps) {
  const day = index + 1;
  const isDimmed = selectedDay !== null && selectedDay !== day;
  const bar = (
    <View style={[styles.barSlot, isDimmed ? styles.dimmed : null]}>
      <StackedBar height={height} index={index} isActive={isActive} segments={segments} />
    </View>
  );

  if (onSelectDay === undefined) {
    return <View style={styles.column}>{bar}</View>;
  }

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ selected: selectedDay === day }}
      onPress={() => {
        selectionChanged();
        onSelectDay(selectedDay === day ? null : day);
      }}
      style={styles.column}
    >
      {bar}
    </Pressable>
  );
}

export function EmptyDayColumn() {
  return <View style={styles.column} />;
}

const styles = StyleSheet.create({
  column: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  barSlot: { width: '100%' },
  dimmed: { opacity: 0.3 },
});
