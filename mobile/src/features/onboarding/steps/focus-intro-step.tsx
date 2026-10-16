import { Text, View } from 'react-native';

import { useCopy } from '@/features/app-shell/localization/language';

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
    </View>
  );
}
