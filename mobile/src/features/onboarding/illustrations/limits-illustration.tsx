import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { useCopy } from '@/features/app-shell/localization/language';
import { AnimatedReveal } from '@/features/app-shell/motion/animated-reveal';

import { onboardingCopy } from '../onboarding-copy';
import { onboardingColors as colors } from '../onboarding-motion';
import { OnboardingIcon } from './onboarding-icon';

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

const styles = StyleSheet.create({
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
});
