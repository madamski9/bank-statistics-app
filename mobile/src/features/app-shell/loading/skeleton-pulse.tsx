import { useEffect, type ReactNode } from 'react';
import { type StyleProp, View, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { overviewColors } from '@/features/app-shell/theme/overview-theme';

interface SkeletonPulseProps {
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

export function useSkeletonPulseStyle(isPulsing: boolean, lowestOpacity = 0.45) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (!isPulsing) {
      opacity.value = withTiming(1, { duration: 240, easing: Easing.out(Easing.quad), reduceMotion: ReduceMotion.System });
      return;
    }

    opacity.value = withRepeat(
      withTiming(lowestOpacity, { duration: 850, easing: Easing.inOut(Easing.quad), reduceMotion: ReduceMotion.System }),
      -1,
      true,
    );

    return () => cancelAnimation(opacity);
  }, [isPulsing, lowestOpacity, opacity]);

  return useAnimatedStyle(() => ({ opacity: opacity.value }));
}

export function SkeletonPulse({ style, children }: SkeletonPulseProps) {
  const pulseStyle = useSkeletonPulseStyle(true);

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[style, pulseStyle]}
    >
      {children}
    </Animated.View>
  );
}

interface SkeletonBarProps {
  width: ViewStyle['width'];
  height: number;
  radius?: number;
  color?: string;
}

export function SkeletonBar({ width, height, radius = height / 2, color = overviewColors.hairline }: SkeletonBarProps) {
  return <View style={{ width, height, borderRadius: radius, backgroundColor: color }} />;
}
