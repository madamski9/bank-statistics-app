import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { useCopy } from '@/features/app-shell/localization/language';
import { overviewColors } from '@/features/app-shell/theme/overview-theme';

import { InstructionCard } from '../components/instruction-card';
import { SectionHeading } from '../components/section-heading';
import { stepStyles } from '../components/step-styles';
import { onboardingCopy } from '../onboarding-copy';

export function AlertToneNotesStep() {
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
    </View>
  );
}

const styles = StyleSheet.create({
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
