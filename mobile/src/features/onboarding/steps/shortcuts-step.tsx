import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { useCopy } from '@/features/app-shell/localization/language';
import { AnimatedReveal } from '@/features/app-shell/motion/animated-reveal';
import { overviewColors } from '@/features/app-shell/theme/overview-theme';

import { SectionHeading } from '../components/section-heading';
import { stepStyles } from '../components/step-styles';
import { ShortcutsIllustration } from '../illustrations/shortcuts-illustration';
import { onboardingCopy } from '../onboarding-copy';
import { onboardingColors } from '../onboarding-motion';

export function ShortcutsStep() {
  const copy = useCopy(onboardingCopy).shortcuts;

  return (
    <View style={stepStyles.stepContent}>
      <ShortcutsIllustration />
      <SectionHeading
        eyebrow={copy.eyebrow}
        title={copy.title}
        description={copy.description}
      />
      <AnimatedReveal delay={180} style={styles.warningCard}>
        <SymbolView
          name={{
            ios: 'bell.slash.fill',
            android: 'notifications_off',
            web: 'notifications_off',
          }}
          size={20}
          tintColor={overviewColors.caution}
        />
        <Text maxFontSizeMultiplier={1.5} style={styles.warningText}>
          {copy.warning}
        </Text>
      </AnimatedReveal>
      <Text style={stepStyles.smallNote}>{copy.manualNote}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  warningCard: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderRadius: 18,
    backgroundColor: onboardingColors.cautionMuted,
    borderWidth: 1,
    borderColor: overviewColors.hairline,
  },
  warningText: {
    flex: 1,
    color: overviewColors.textPrimary,
    fontSize: 14,
    lineHeight: 21,
  },
});
