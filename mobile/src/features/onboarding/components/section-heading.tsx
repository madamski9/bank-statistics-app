import { StyleSheet, Text } from 'react-native';

import { AnimatedReveal } from '@/features/app-shell/motion/animated-reveal';

import { stepStyles } from './step-styles';

interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  description: string;
}

export function SectionHeading({ eyebrow, title, description }: SectionHeadingProps) {
  return (
    <AnimatedReveal delay={60} style={styles.heading}>
      <Text maxFontSizeMultiplier={1.4} style={stepStyles.eyebrow}>
        {eyebrow}
      </Text>
      <Text accessibilityRole="header" style={stepStyles.title}>
        {title}
      </Text>
      <Text style={stepStyles.description}>
        {description}
      </Text>
    </AnimatedReveal>
  );
}

const styles = StyleSheet.create({
  heading: { gap: 12 },
});
