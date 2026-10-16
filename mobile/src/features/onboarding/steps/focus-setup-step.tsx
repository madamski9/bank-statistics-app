import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { useCopy } from '@/features/app-shell/localization/language';
import { overviewColors } from '@/features/app-shell/theme/overview-theme';

import { InstructionCard } from '../components/instruction-card';
import { SectionHeading } from '../components/section-heading';
import { stepStyles } from '../components/step-styles';
import { onboardingCopy } from '../onboarding-copy';

export function FocusSetupStep() {
  const copy = useCopy(onboardingCopy).focusSetup;

  return (
    <View style={stepStyles.stepContent}>
      <SectionHeading
        eyebrow={copy.eyebrow}
        title={copy.title}
        description={copy.description}
      />
      <InstructionCard number={1} title={copy.stepOne} />
      <InstructionCard number={2} title={copy.stepTwo}>
        <Image
          accessible={false}
          contentFit="contain"
          source={require('../assets/focus-step-apps.png')}
          style={[styles.stepScreenshot, styles.appsScreenshot]}
        />
      </InstructionCard>
      <InstructionCard number={3} title={copy.stepThree}>
        <Image
          accessible={false}
          contentFit="contain"
          source={require('../assets/focus-step-allow.png')}
          style={[styles.stepScreenshot, styles.allowScreenshot]}
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
  appsScreenshot: { aspectRatio: 786 / 505 },
  allowScreenshot: { aspectRatio: 786 / 637 },
});
