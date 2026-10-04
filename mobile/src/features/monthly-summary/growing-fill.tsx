import { useEffect } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';

const fillSpring = { duration: 620, dampingRatio: 0.85, reduceMotion: ReduceMotion.System };

interface GrowingFillProps {
  fraction: number;
  color: string;
  delayMs?: number;
  style?: StyleProp<ViewStyle>;
}

export function GrowingFill({ fraction, color, delayMs = 0, style }: GrowingFillProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.set(withDelay(delayMs, withSpring(fraction, fillSpring)));
  }, [delayMs, fraction, progress]);

  const growthStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: progress.get() }],
  }));

  return (
    <Animated.View
      style={[
        { width: '100%', height: '100%', transformOrigin: 'left', backgroundColor: color },
        style,
        growthStyle,
      ]}
    />
  );
}
