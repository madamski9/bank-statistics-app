import { Text, View } from 'react-native';

import { useCopy } from '@/features/app-shell/localization/language';

import { SectionHeading } from '../components/section-heading';
import { stepStyles } from '../components/step-styles';
import { FocusIllustration } from '../illustrations/focus-illustration';
import { onboardingCopy } from '../onboarding-copy';

export function FocusIntroStep() {
  const copy = useCopy(onboardingCopy).focusIntro;

  return (
    <View style={stepStyles.stepContent}>
      <FocusIllustration />
      <SectionHeading
        eyebrow={copy.eyebrow}
        title={copy.title}
        description={copy.description}
      />
      <Text style={stepStyles.smallNote}>{copy.note}</Text>
    </View>
  );
}
