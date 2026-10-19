import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { useCopy } from '@/features/app-shell/localization/language';
import { overviewColors } from '@/features/app-shell/theme/overview-theme';

import { InstructionCard } from '../components/instruction-card';
import { SectionHeading } from '../components/section-heading';
import { stepStyles } from '../components/step-styles';
import { onboardingCopy } from '../onboarding-copy';
import { onboardingColors } from '../onboarding-motion';

export function ReleaseNotesStep() {
  const copy = useCopy(onboardingCopy).releaseNotes;

  return (
    <View style={stepStyles.stepContent}>
      <SectionHeading
        eyebrow={copy.eyebrow}
        title={copy.title}
        description={copy.description}
      />
      <InstructionCard number={1} title={copy.stepOne}>
        <Image
          accessible={false}
          contentFit="contain"
          source={require('../assets/news-step-limit-button.png')}
          style={[styles.stepScreenshot, styles.limitButtonScreenshot]}
        />
      </InstructionCard>
      <InstructionCard number={2} title={copy.stepTwo}>
        <Image
          accessible={false}
          contentFit="contain"
          source={require('../assets/news-step-alert-tone.png')}
          style={[styles.stepScreenshot, styles.alertToneScreenshot]}
        />
      </InstructionCard>
      <View style={styles.fixCard}>
        <SymbolView
          name={{ ios: 'person.badge.key.fill', android: 'key', web: 'key' }}
          size={22}
          tintColor={onboardingColors.accentText}
        />
        <View style={styles.fixText}>
          <Text maxFontSizeMultiplier={1.5} style={styles.fixTitle}>{copy.signOutFixTitle}</Text>
          <Text maxFontSizeMultiplier={1.5} style={styles.fixDescription}>
            {copy.signOutFixDescription}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fixCard: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderRadius: 18,
    backgroundColor: onboardingColors.accentMuted,
    borderWidth: 1,
    borderColor: overviewColors.hairline,
  },
  fixText: { flex: 1, gap: 4 },
  fixTitle: {
    color: overviewColors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  fixDescription: {
    color: overviewColors.textPrimary,
    fontSize: 14,
    lineHeight: 21,
  },
  stepScreenshot: {
    width: '100%',
    marginTop: 4,
    marginBottom: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: overviewColors.hairline,
    backgroundColor: overviewColors.background,
  },
  limitButtonScreenshot: { aspectRatio: 786 / 407 },
  alertToneScreenshot: { aspectRatio: 786 / 541 },
});
