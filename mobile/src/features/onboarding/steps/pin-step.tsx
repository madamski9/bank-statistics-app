import { useWindowDimensions, View } from 'react-native';

import { useCopy } from '@/features/app-shell/localization/language';
import { PinSetup } from '@/features/settings/privacy/app-lock/pin-setup';

import { SectionHeading } from '../components/section-heading';
import { stepStyles } from '../components/step-styles';
import { SecurityIllustration } from '../illustrations/security-illustration';
import { onboardingCopy } from '../onboarding-copy';

interface PinStepProps {
  biometricName: string | null;
  onComplete: (pin: string) => Promise<void>;
}

export function PinStep({ biometricName, onComplete }: PinStepProps) {
  const copy = useCopy(onboardingCopy).pin;
  const { height, fontScale } = useWindowDimensions();
  return (
    <View style={stepStyles.stepContent}>
      {height >= 900 && fontScale <= 1.2 ? <SecurityIllustration /> : null}
      <SectionHeading
        description={
          biometricName === null ? copy.pinOnly : copy.withBiometric(biometricName)
        }
        eyebrow={copy.eyebrow}
        title={copy.title}
      />
      <PinSetup isCompact onComplete={onComplete} />
    </View>
  );
}
