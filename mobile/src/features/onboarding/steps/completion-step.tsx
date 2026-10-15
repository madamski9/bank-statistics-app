import { StyleSheet, Text, View } from 'react-native';

import { useCopy } from '@/features/app-shell/localization/language';
import { AnimatedReveal } from '@/features/app-shell/motion/animated-reveal';
import { overviewColors } from '@/features/app-shell/theme/overview-theme';

import { stepStyles } from '../components/step-styles';
import { CompletionIllustration } from '../illustrations/completion-illustration';
import { onboardingCopy } from '../onboarding-copy';

export function CompletionStep() {
  const copy = useCopy(onboardingCopy).completion;
  return (
    <View style={[stepStyles.stepContent, styles.completionContent]}>
      <CompletionIllustration />
      <View style={styles.completionHeading}>
        <Text
          maxFontSizeMultiplier={1.35}
          style={[stepStyles.title, styles.completionTitle]}
        >
          {copy.title}
        </Text>
        <Text
          maxFontSizeMultiplier={1.5}
          style={[stepStyles.description, styles.completionDescription]}
        >
          {copy.description}
        </Text>
      </View>
      <AnimatedReveal delay={280} style={styles.completionNote}>
        <Text maxFontSizeMultiplier={1.4} style={styles.completionNoteTitle}>
          {copy.noteTitle}
        </Text>
        <Text maxFontSizeMultiplier={1.5} style={styles.completionNoteText}>
          {copy.noteText}
        </Text>
      </AnimatedReveal>
    </View>
  );
}

const styles = StyleSheet.create({
  completionContent: {
    alignItems: 'center',
    gap: 32,
    paddingVertical: 24,
  },
  completionHeading: { alignItems: 'center', gap: 16 },
  completionTitle: { textAlign: 'center' },
  completionDescription: { textAlign: 'center', maxWidth: 320 },
  completionNote: {
    width: '100%',
    maxWidth: 340,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: overviewColors.hairline,
    paddingTop: 24,
    gap: 8,
  },
  completionNoteTitle: {
    color: overviewColors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  completionNoteText: {
    color: overviewColors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
});
