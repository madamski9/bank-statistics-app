import { useEffect, type ComponentProps } from 'react';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { AnimatedReveal } from '@/features/app-shell/motion/animated-reveal';
import { ScalePressable } from '@/features/app-shell/motion/scale-pressable';
import { overviewColors } from '@/features/app-shell/theme/overview-theme';

import { onboardingColors, onboardingMotion } from '../onboarding-motion';

type SelectionCardProps = ComponentProps<typeof ScalePressable> & { selected: boolean; delay?: number };

export function SelectionCard({ selected, delay = 0, style, children, ...props }: SelectionCardProps) {
  const selection = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    selection.set(withTiming(selected ? 1 : 0, onboardingMotion.selection));
  }, [selected, selection]);

  const selectionStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(selection.get(), [0, 1], [overviewColors.hairline, onboardingColors.accent]),
    backgroundColor: interpolateColor(selection.get(), [0, 1], [overviewColors.surface, onboardingColors.accentMuted]),
  }));

  return (
    <AnimatedReveal delay={delay}>
      <ScalePressable {...props} pressedScale={0.985}>
        <Animated.View style={[style, selectionStyle]}>{children}</Animated.View>
      </ScalePressable>
    </AnimatedReveal>
  );
}
