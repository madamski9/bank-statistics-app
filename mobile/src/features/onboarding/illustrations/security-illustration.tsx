import { StyleSheet } from 'react-native';

import { AnimatedReveal } from '@/features/app-shell/motion/animated-reveal';
import { bubbleTints } from '@/features/app-shell/theme/overview-theme';
import { BubbleSkin } from '@/features/home/overview/bubbles/bubble-skin';

import { Halo, IllustrationFrame } from './illustration-frame';
import { OnboardingIcon } from './onboarding-icon';

export function SecurityIllustration() {
  return (
    <IllustrationFrame compact>
      <Halo />
      <AnimatedReveal delay={80} style={styles.centerBubble}>
        <BubbleSkin size={104} tint={bubbleTints.net} />
        <OnboardingIcon name="shield" size={42} />
      </AnimatedReveal>
    </IllustrationFrame>
  );
}

const styles = StyleSheet.create({
  centerBubble: { position: 'absolute', left: 88, top: 36, width: 104, height: 104, alignItems: 'center', justifyContent: 'center' },
});
