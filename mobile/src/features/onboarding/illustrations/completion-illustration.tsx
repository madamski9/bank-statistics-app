import { StyleSheet } from 'react-native';

import { AnimatedReveal } from '@/features/app-shell/motion/animated-reveal';
import { bubbleTints } from '@/features/app-shell/theme/overview-theme';
import { BubbleSkin } from '@/features/home/overview/bubbles/bubble-skin';

import { onboardingColors as colors } from '../onboarding-motion';
import { Halo, IllustrationFrame } from './illustration-frame';
import { OnboardingIcon } from './onboarding-icon';

export function CompletionIllustration() {
  return (
    <IllustrationFrame>
      <Halo tone="success" />
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
    </IllustrationFrame>
  );
}

const styles = StyleSheet.create({
  centerBubble: { position: 'absolute', left: 88, top: 36, width: 104, height: 104, alignItems: 'center', justifyContent: 'center' },
  leftSpark: { position: 'absolute', left: 52, top: 104 },
  rightSpark: { position: 'absolute', right: 40, top: 38 },
});
