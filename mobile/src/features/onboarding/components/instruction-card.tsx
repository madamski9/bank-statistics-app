import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AnimatedReveal } from '@/features/app-shell/motion/animated-reveal';

import { onboardingColors } from '../onboarding-motion';
import { stepStyles } from './step-styles';

interface InstructionCardProps {
  number: number;
  title: string;
  children: ReactNode;
}

export function InstructionCard({ number, title, children }: InstructionCardProps) {
  return (
    <AnimatedReveal delay={number * 100} style={stepStyles.stepsCard}>
      <View style={styles.instructionHeading}>
        <View style={styles.instructionNumber}><Text style={styles.instructionNumberText}>{number}</Text></View>
        <Text style={[stepStyles.stepsTitle, styles.instructionTitle]}>{title.replace(/^\d+\.\s*/, '')}</Text>
      </View>
      {children}
    </AnimatedReveal>
  );
}

const styles = StyleSheet.create({
  instructionHeading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  instructionNumber: { width: 32, height: 32, borderRadius: 12, backgroundColor: onboardingColors.accentMuted, alignItems: 'center', justifyContent: 'center' },
  instructionNumberText: { color: onboardingColors.accentText, fontSize: 14, fontWeight: '700' },
  instructionTitle: { flex: 1 },
});
