import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { AnimatedReveal } from '@/features/app-shell/animated-reveal';
import { BubbleSkin } from '@/features/spending-overview/bubble-skin';
import { bubbleTints } from '@/features/spending-overview/overview-theme';

import { AuthIcon } from './auth-icon';
import { authMotion } from './auth-motion';
import { authColors } from './auth-theme';

interface SignInIllustrationProps {
  isCodeStep: boolean;
  isCompact: boolean;
  isFocused: boolean;
}

export function SignInIllustration({ isCodeStep, isCompact, isFocused }: SignInIllustrationProps) {
  const reduceMotion = useReducedMotion();
  const phase = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion || isFocused) {
      cancelAnimation(phase);
      return;
    }

    phase.set(withRepeat(
      withTiming(phase.get() + Math.PI * 2, authMotion.float),
      -1,
      false,
      undefined,
      ReduceMotion.System,
    ));

    return () => cancelAnimation(phase);
  }, [phase, isFocused, reduceMotion]);

  const mainStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: (Math.cos(phase.get()) - 1) * 1.5 },
      { translateY: Math.sin(phase.get()) * -3 },
    ],
  }));
  const pinkStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: Math.sin(phase.get()) * -2 },
      { translateY: (Math.sin(phase.get() + 1) - Math.sin(1)) * 3 },
    ],
  }));
  const greenStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: (Math.sin(phase.get() + 2) - Math.sin(2)) * 2 },
      { translateY: Math.sin(phase.get()) * 4 },
    ],
  }));

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={[styles.frame, isCompact && styles.compactFrame]}
    >
      <View style={[styles.constellation, isCompact && styles.compactConstellation]}>
        <View style={styles.halo} />
        <AnimatedReveal delay={160} style={styles.pinkPosition}>
          <Animated.View style={[styles.smallBubble, pinkStyle]}>
            <BubbleSkin size={66} tint={bubbleTints.expense} />
            <AuthIcon name="expense" color={bubbleTints.expense.film} size={24} />
          </Animated.View>
        </AnimatedReveal>
        <AnimatedReveal delay={80} style={styles.mainPosition}>
          <Animated.View style={[styles.mainBubble, mainStyle]}>
            <BubbleSkin size={116} tint={bubbleTints.net} />
            <AnimatedReveal key={isCodeStep ? 'mail' : 'chart'}>
              <AuthIcon name={isCodeStep ? 'mail' : 'chart'} color={authColors.accentText} size={40} />
            </AnimatedReveal>
          </Animated.View>
        </AnimatedReveal>
        <AnimatedReveal delay={240} style={styles.greenPosition}>
          <Animated.View style={[styles.greenBubble, greenStyle]}>
            <BubbleSkin size={54} tint={bubbleTints.income} />
            <AuthIcon name={isCodeStep ? 'check' : 'income'} color={bubbleTints.income.film} size={22} />
          </Animated.View>
        </AnimatedReveal>
        <View style={[styles.spark, styles.sparkLeft]} />
        <View style={[styles.spark, styles.sparkRight]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    height: 168,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactFrame: {
    height: 116,
  },
  constellation: {
    width: 264,
    height: 160,
  },
  compactConstellation: {
    transform: [{ scale: 0.74 }],
  },
  halo: {
    position: 'absolute',
    width: 280,
    height: 200,
    left: -8,
    top: -20,
    experimental_backgroundImage: `radial-gradient(ellipse at 50% 50%, rgba(${bubbleTints.net.rgb}, 0.13) 0%, rgba(${bubbleTints.net.rgb}, 0) 70%)`,
  },
  mainPosition: {
    position: 'absolute',
    left: 76,
    top: 26,
  },
  mainBubble: {
    width: 116,
    height: 116,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinkPosition: {
    position: 'absolute',
    left: 16,
    top: 70,
  },
  smallBubble: {
    width: 66,
    height: 66,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greenPosition: {
    position: 'absolute',
    left: 190,
    top: 18,
  },
  greenBubble: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spark: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: authColors.accentText,
    opacity: 0.5,
  },
  sparkLeft: {
    left: 62,
    top: 30,
  },
  sparkRight: {
    left: 216,
    top: 116,
  },
});
