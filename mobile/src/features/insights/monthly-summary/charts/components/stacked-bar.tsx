import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';

export const barStaggerMs = 14;
const barSpring = { duration: 520, dampingRatio: 0.82, reduceMotion: ReduceMotion.System };

export interface BarSegment {
  key: string;
  fraction: number;
  color: string;
}

interface StackedBarProps {
  index: number;
  isActive: boolean;
  height: number;
  segments: BarSegment[];
}

export function StackedBar({ index, isActive, height, segments }: StackedBarProps) {
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

const styles = StyleSheet.create({
  stack: {
    width: '100%',
    flexDirection: 'column-reverse',
    overflow: 'hidden',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    transformOrigin: 'bottom',
  },
});
