import { Text, View } from 'react-native';

import { useCopy } from '@/features/app-shell/localization/language';

import { SectionHeading } from '../components/section-heading';
import { stepStyles } from '../components/step-styles';
import { FocusIllustration } from '../illustrations/focus-illustration';
import { onboardingCopy } from '../onboarding-copy';

interface FocusIntroStepProps {
  isWalletOnly: boolean;
}

export function FocusIntroStep({ isWalletOnly }: FocusIntroStepProps) {
  const copy = useCopy(onboardingCopy).focusIntro;

  return (
    <View style={stepStyles.stepContent}>
      <FocusIllustration />
      <SectionHeading
        eyebrow={copy.eyebrow}
        title={isWalletOnly ? copy.walletTitle : copy.title}
        description={isWalletOnly ? copy.walletDescription : copy.description}
      />
      <Text style={stepStyles.smallNote}>{copy.note}</Text>
    </View>
  );
}
