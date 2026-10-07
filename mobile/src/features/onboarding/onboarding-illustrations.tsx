import { Image } from 'expo-image';
import { useEffect, type ReactNode } from 'react';
import { AppState, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { useCopy } from '@/features/localization/language';
import { AnimatedReveal } from '@/features/app-shell/animated-reveal';
import { BubbleSkin } from '@/features/spending-overview/bubble-skin';
import { bubbleTints } from '@/features/spending-overview/overview-theme';

import { onboardingCopy } from './onboarding-copy';
import { onboardingColors as colors, onboardingMotion } from './onboarding-motion';

const iconPaths = {
  chart: 'M5 19v-6m7 6V8m7 11V4',
  income: 'M6 16 17 5M6 5h11v11',
  expense: 'M6 6 17 17M6 17h11V6',
  check: 'm5 12 4 4L19 6',
  shield: 'M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Zm-4 9 3 3 5-6',
  bell: 'M9 20h6M5 16h14l-2-3V9a5 5 0 0 0-10 0v4l-2 3Z',
  sparkle: 'm12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4L12 3Z',
} as const;

export function OnboardingIcon({
  name,
  color = colors.accentText,
  size = 24,
}: {
  name: keyof typeof iconPaths;
  color?: string;
  size?: number;
}) {
  return (
    <Svg aria-hidden width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d={iconPaths[name]} stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function Illustration({ children, compact = false }: { children: ReactNode; compact?: boolean }) {
  const { height, fontScale } = useWindowDimensions();
  const isCompact = compact || height < 740 || fontScale > 1.3;

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={[styles.illustration, isCompact && styles.compactIllustration]}
    >
      <View style={[styles.canvas, isCompact && styles.compactCanvas]}>{children}</View>
    </View>
  );
}

function useIllustrationPhase() {
  const phase = useSharedValue(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) {
      return;
    }

    const start = () => {
      phase.set(withRepeat(
        withTiming(phase.get() + Math.PI * 2, onboardingMotion.float),
        -1,
        false,
        undefined,
        ReduceMotion.System,
      ));
    };

    if (AppState.currentState === 'active') {
      start();
    }

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        start();
      } else {
        cancelAnimation(phase);
      }
    });

    return () => {
      subscription.remove();
      cancelAnimation(phase);
    };
  }, [phase, reduceMotion]);

  return phase;
}

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
    <Illustration>
      <View style={styles.halo} />
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
    </Illustration>
  );
}

export function LimitsIllustration() {
  const copy = useCopy(onboardingCopy).limits;
  const fill = useSharedValue(0);

  useEffect(() => {
    fill.set(withDelay(180, withTiming(1, {
      duration: 1000,
      easing: Easing.out(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    }), ReduceMotion.System));

    return () => cancelAnimation(fill);
  }, [fill]);

  const fillStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: fill.get() }] }));

  return (
    <AnimatedReveal delay={80} style={styles.limitCard}>
      <View style={styles.limitHeader}>
        <View style={styles.limitIcon}><OnboardingIcon name="chart" /></View>
        <View style={styles.limitHeading}>
          <Text style={styles.caption}>{copy.caption}</Text>
          <Text style={styles.merchant}>{copy.merchant}</Text>
        </View>
        <Text style={styles.amount}>{copy.amount}</Text>
      </View>
      <View style={styles.limitTrack}>
        <Animated.View style={[styles.limitFill, fillStyle]} />
      </View>
      <Text style={styles.meta}>{copy.example}</Text>
      <AnimatedReveal delay={650} style={styles.limitNotification}>
        <OnboardingIcon name="bell" color={colors.caution} size={20} />
        <Text style={styles.notificationText}>{copy.alertPreview}</Text>
        <Text style={styles.percentage}>80%</Text>
      </AnimatedReveal>
    </AnimatedReveal>
  );
}

export function ShortcutsIllustration() {
  const phase = useIllustrationPhase();
  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: Math.sin(phase.get()) * -3 }],
  }));

  return (
    <Illustration>
      <View style={styles.halo} />
      <View style={styles.connection} />
      <AnimatedReveal delay={100} style={[styles.connectionNode, styles.notificationNode]}>
        <OnboardingIcon name="bell" color={colors.textPrimary} size={26} />
      </AnimatedReveal>
      <AnimatedReveal delay={200} style={styles.shortcutsPosition}>
        <Animated.View style={[styles.shortcutsTile, floatStyle]}>
          <Image contentFit="contain" source={require('./assets/shortcuts.png')} style={styles.shortcutsImage} />
        </Animated.View>
      </AnimatedReveal>
      <AnimatedReveal delay={300} style={[styles.connectionNode, styles.bankstatsNode]}>
        <OnboardingIcon name="chart" color={colors.positive} size={26} />
      </AnimatedReveal>
    </Illustration>
  );
}

export function SecurityIllustration() {
  return (
    <Illustration compact>
      <View style={styles.halo} />
      <AnimatedReveal delay={80} style={styles.centerBubble}>
        <BubbleSkin size={104} tint={bubbleTints.net} />
        <OnboardingIcon name="shield" size={42} />
      </AnimatedReveal>
    </Illustration>
  );
}

export function CompletionIllustration() {
  return (
    <Illustration>
      <View style={[styles.halo, styles.successHalo]} />
      <AnimatedReveal delay={80} style={styles.centerBubble}>
        <BubbleSkin size={104} tint={bubbleTints.income} />
        <AnimatedReveal delay={240}>
          <OnboardingIcon name="check" color={colors.positive} size={46} />
        </AnimatedReveal>
      </AnimatedReveal>
      <AnimatedReveal delay={320} style={styles.leftSpark}>
        <OnboardingIcon name="sparkle" size={18} />
      </AnimatedReveal>
      <AnimatedReveal delay={400} style={styles.rightSpark}>
        <OnboardingIcon name="sparkle" color={colors.positive} size={24} />
      </AnimatedReveal>
    </Illustration>
  );
}

const styles = StyleSheet.create({
  illustration: { height: 176, alignItems: 'center', justifyContent: 'center' },
  compactIllustration: { height: 112 },
  canvas: { width: 280, height: 176 },
  compactCanvas: { transform: [{ scale: 0.72 }] },
  halo: {
    position: 'absolute', width: 300, height: 220, left: -10, top: -22,
    experimental_backgroundImage: `radial-gradient(ellipse at 50% 50%, rgba(${bubbleTints.net.rgb}, 0.15) 0%, rgba(${bubbleTints.net.rgb}, 0) 70%)`,
  },
  expensePosition: { position: 'absolute', left: 24, top: 28 },
  expenseBubble: { width: 128, height: 128, alignItems: 'center', justifyContent: 'center' },
  incomePosition: { position: 'absolute', left: 164, top: 8 },
  incomeBubble: { width: 86, height: 86, alignItems: 'center', justifyContent: 'center' },
  netPosition: { position: 'absolute', left: 172, top: 112 },
  netBubble: { width: 60, height: 60, alignItems: 'center', justifyContent: 'center' },
  limitCard: {
    gap: 16, padding: 20, borderRadius: 24, borderWidth: 1,
    borderColor: colors.accentBorder, backgroundColor: colors.surface,
  },
  limitHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 },
  limitIcon: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: colors.accentMuted,
    alignItems: 'center', justifyContent: 'center',
  },
  limitHeading: { flex: 1, minWidth: 120, gap: 4 },
  caption: { color: colors.textSecondary, fontSize: 11, fontWeight: '600', letterSpacing: 1 },
  merchant: { color: colors.textPrimary, fontSize: 16, fontWeight: '600' },
  amount: { color: colors.textPrimary, fontSize: 24, fontWeight: '700', letterSpacing: -0.7 },
  limitTrack: { height: 8, borderRadius: 4, backgroundColor: colors.surfacePressed, overflow: 'hidden' },
  limitFill: {
    width: '80%', height: '100%', borderRadius: 4, transformOrigin: 'left',
    backgroundColor: colors.caution,
    experimental_backgroundImage: `linear-gradient(to right, ${colors.positive} 0%, ${colors.caution} 100%)`,
  },
  meta: { color: colors.textSecondary, fontSize: 12, lineHeight: 18 },
  limitNotification: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12,
    borderRadius: 14, backgroundColor: colors.cautionMuted,
  },
  notificationText: { flex: 1, color: colors.textPrimary, fontSize: 12, lineHeight: 18 },
  percentage: { color: colors.caution, fontSize: 15, fontWeight: '700' },
  connection: { position: 'absolute', left: 44, right: 44, top: 87, height: 1, backgroundColor: colors.accentBorder },
  connectionNode: {
    position: 'absolute', top: 61, width: 54, height: 54, borderRadius: 18,
    backgroundColor: colors.surfacePressed, borderColor: colors.hairline, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  notificationNode: { left: 8 },
  bankstatsNode: { right: 8 },
  shortcutsPosition: { position: 'absolute', left: 92, top: 40 },
  shortcutsTile: {
    width: 96, height: 96, alignItems: 'center', justifyContent: 'center',
    borderRadius: 28, borderWidth: 1, borderColor: colors.accentBorder, backgroundColor: colors.surface,
  },
  shortcutsImage: { width: 80, height: 80 },
  centerBubble: { position: 'absolute', left: 88, top: 36, width: 104, height: 104, alignItems: 'center', justifyContent: 'center' },
  successHalo: {
    experimental_backgroundImage: `radial-gradient(ellipse at 50% 50%, rgba(${bubbleTints.income.rgb}, 0.12) 0%, rgba(${bubbleTints.income.rgb}, 0) 70%)`,
  },
  leftSpark: { position: 'absolute', left: 52, top: 104 },
  rightSpark: { position: 'absolute', right: 40, top: 38 },
});
