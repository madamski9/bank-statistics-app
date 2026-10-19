import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { useCopy } from '@/features/app-shell/localization/language';
import { overviewColors } from '@/features/app-shell/theme/overview-theme';

import { InstructionCard } from '../components/instruction-card';
import { SectionHeading } from '../components/section-heading';
import { stepStyles } from '../components/step-styles';
import { FocusIllustration } from '../illustrations/focus-illustration';
import { onboardingCopy } from '../onboarding-copy';

interface FocusIntroStepProps {
  isAnnouncement?: boolean;
}

export function FocusIntroStep({ isAnnouncement = false }: FocusIntroStepProps) {
  const copy = useCopy(onboardingCopy);
  const heading = isAnnouncement ? copy.focusAnnouncement : copy.focusIntro;

  return (
    <View style={stepStyles.stepContent}>
      <FocusIllustration />
      <SectionHeading
        eyebrow={heading.eyebrow}
        title={heading.title}
        description={heading.description}
      />
      <Text style={stepStyles.smallNote}>{copy.focusIntro.note}</Text>
      {isAnnouncement ? (
        <>
          <View style={styles.releaseHeading}>
            <Text maxFontSizeMultiplier={1.5} style={styles.releaseTitle}>{copy.focusAnnouncement.releaseTitle}</Text>
            <Text maxFontSizeMultiplier={1.5} style={stepStyles.description}>
              {copy.focusAnnouncement.releaseDescription}
            </Text>
          </View>
          <InstructionCard number={1} title={copy.focusAnnouncement.releaseStepOne}>
            <Image
              accessible={false}
              contentFit="contain"
              source={require('../assets/news-step-limit-button.png')}
              style={[styles.stepScreenshot, styles.limitButtonScreenshot]}
            />
          </InstructionCard>
          <InstructionCard number={2} title={copy.focusAnnouncement.releaseStepTwo}>
            <Image
              accessible={false}
              contentFit="contain"
              source={require('../assets/news-step-alert-tone.png')}
              style={[styles.stepScreenshot, styles.alertToneScreenshot]}
            />
          </InstructionCard>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  releaseHeading: { gap: 8, marginTop: 8 },
  releaseTitle: {
    color: overviewColors.textPrimary,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.4,
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
