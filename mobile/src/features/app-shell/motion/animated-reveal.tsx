import { useEffect, type ComponentProps } from 'react';
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

interface AnimatedRevealProps extends ComponentProps<typeof Animated.View> {
  delay?: number;
  direction?: 'up' | 'left' | 'right';
  distance?: number;
  duration?: number;
}

export function AnimatedReveal({
  delay = 0,
  direction = 'up',
  distance = 10,
  duration = 360,
  style,
  ...props
}: AnimatedRevealProps) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    progress.set(withDelay(delay, withTiming(1, {
      duration,
      easing: Easing.out(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    }), ReduceMotion.System));

    return () => cancelAnimation(progress);
  }, [delay, duration, progress]);

  const revealStyle = useAnimatedStyle(() => ({
    opacity: progress.get(),
    transform: [
      { translateX: direction === 'up' ? 0 : (1 - progress.get()) * distance * (direction === 'left' ? -1 : 1) },
      { translateY: direction === 'up' ? (1 - progress.get()) * distance : 0 },
    ],
  }));

  return <Animated.View {...props} style={[style, revealStyle]} />;
}
