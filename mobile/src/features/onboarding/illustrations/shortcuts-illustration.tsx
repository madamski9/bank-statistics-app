import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { AnimatedReveal } from '@/features/app-shell/motion/animated-reveal';

import { onboardingColors as colors } from '../onboarding-motion';
import { Halo, IllustrationFrame } from './illustration-frame';
import { OnboardingIcon } from './onboarding-icon';
import { useIllustrationPhase } from './use-illustration-phase';

export function ShortcutsIllustration() {
  const phase = useIllustrationPhase();
  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: Math.sin(phase.get()) * -3 }],
  }));

  return (
    <IllustrationFrame>
      <Halo />
      <View style={styles.connection} />
      <AnimatedReveal delay={100} style={[styles.connectionNode, styles.notificationNode]}>
        <OnboardingIcon name="bell" color={colors.textPrimary} size={26} />
      </AnimatedReveal>
      <AnimatedReveal delay={200} style={styles.shortcutsPosition}>
        <Animated.View style={[styles.shortcutsTile, floatStyle]}>
          <Image contentFit="contain" source={require('../assets/shortcuts.png')} style={styles.shortcutsImage} />
        </Animated.View>
      </AnimatedReveal>
      <AnimatedReveal delay={300} style={[styles.connectionNode, styles.bankstatsNode]}>
        <OnboardingIcon name="chart" color={colors.positive} size={26} />
      </AnimatedReveal>
    </IllustrationFrame>
  );
}

const styles = StyleSheet.create({
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
});
