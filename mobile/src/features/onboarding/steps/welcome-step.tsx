import { View } from 'react-native';

import { useCopy } from '@/features/app-shell/localization/language';

import { FeatureRow } from '../components/feature-row';
import { SectionHeading } from '../components/section-heading';
import { stepStyles } from '../components/step-styles';
import { WelcomeIllustration } from '../illustrations/welcome-illustration';
import { onboardingCopy } from '../onboarding-copy';

export function WelcomeStep() {
  const copy = useCopy(onboardingCopy).welcome;

  return (
    <View style={stepStyles.stepContent}>
      <WelcomeIllustration />
      <SectionHeading
        eyebrow={copy.eyebrow}
        title={copy.title}
        description={copy.description}
      />
      <View style={stepStyles.featureList}>
        <FeatureRow
          symbol="chart.bar.fill"
          title={copy.spendingTitle}
          description={copy.spendingDescription}
        />
        <FeatureRow
          delay={220}
          symbol="lock.shield.fill"
          title={copy.controlTitle}
          description={copy.controlDescription}
        />
      </View>
    </View>
  );
}
