import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { AnimatedReveal } from '@/features/app-shell/motion/animated-reveal';
import { bubbleTints } from '@/features/app-shell/theme/overview-theme';
import { BubbleSkin } from '@/features/home/overview/bubbles/bubble-skin';

import { Halo, IllustrationFrame } from './illustration-frame';
import { OnboardingIcon } from './onboarding-icon';
import { useIllustrationPhase } from './use-illustration-phase';

export function WelcomeIllustration() {
  const phase = useIllustrationPhase();
  const expenseStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: Math.sin(phase.get()) * 3 }],
  }));
  const incomeStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (Math.sin(phase.get() + 1) - Math.sin(1)) * 3 }],
  }));
  const netStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: Math.sin(phase.get()) * 2 }],
  }));

  return (
    <IllustrationFrame>
      <Halo />
      <AnimatedReveal delay={80} style={styles.expensePosition}>
        <Animated.View style={[styles.expenseBubble, expenseStyle]}>
          <BubbleSkin size={128} tint={bubbleTints.expense} />
          <OnboardingIcon name="chart" color={bubbleTints.expense.film} size={40} />
        </Animated.View>
      </AnimatedReveal>
      <AnimatedReveal delay={140} style={styles.incomePosition}>
        <Animated.View style={[styles.incomeBubble, incomeStyle]}>
          <BubbleSkin size={86} tint={bubbleTints.income} />
          <OnboardingIcon name="income" color={bubbleTints.income.film} size={28} />
        </Animated.View>
      </AnimatedReveal>
      <AnimatedReveal delay={200} style={styles.netPosition}>
        <Animated.View style={[styles.netBubble, netStyle]}>
          <BubbleSkin size={60} tint={bubbleTints.net} />
          <OnboardingIcon name="expense" size={22} />
        </Animated.View>
      </AnimatedReveal>
    </IllustrationFrame>
  );
}

const styles = StyleSheet.create({
  expensePosition: { position: 'absolute', left: 24, top: 28 },
  expenseBubble: { width: 128, height: 128, alignItems: 'center', justifyContent: 'center' },
  incomePosition: { position: 'absolute', left: 164, top: 8 },
  incomeBubble: { width: 86, height: 86, alignItems: 'center', justifyContent: 'center' },
  netPosition: { position: 'absolute', left: 172, top: 112 },
  netBubble: { width: 60, height: 60, alignItems: 'center', justifyContent: 'center' },
});
