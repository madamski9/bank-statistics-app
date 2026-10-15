import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { useCopy } from '@/features/app-shell/localization/language';
import { overviewColors } from '@/features/app-shell/theme/overview-theme';

import { InstructionCard } from '../components/instruction-card';
import { SectionHeading } from '../components/section-heading';
import { stepStyles } from '../components/step-styles';
import { onboardingCopy } from '../onboarding-copy';

export function AutomationStep() {
  const copy = useCopy(onboardingCopy).automation;
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
          source={require('../assets/shortcuts-step-automation-tab.png')}
          style={[styles.stepScreenshot, styles.automationTabScreenshot]}
        />
      </InstructionCard>
      <InstructionCard number={2} title={copy.stepTwo}>
        <Image
          accessible={false}
          contentFit="contain"
          source={require('../assets/shortcuts-step-enable-toggle.png')}
          style={[styles.stepScreenshot, styles.enableToggleScreenshot]}
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
  automationTabScreenshot: { aspectRatio: 786 / 650 },
  enableToggleScreenshot: { aspectRatio: 786 / 913 },
});
