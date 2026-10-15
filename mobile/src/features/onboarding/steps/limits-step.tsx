import { Text, View } from 'react-native';

import { useCopy } from '@/features/app-shell/localization/language';

import { FeatureRow } from '../components/feature-row';
import { SectionHeading } from '../components/section-heading';
import { stepStyles } from '../components/step-styles';
import { LimitsIllustration } from '../illustrations/limits-illustration';
import { onboardingCopy } from '../onboarding-copy';

export function LimitsStep() {
  const copy = useCopy(onboardingCopy).limits;
  return (
    <View style={stepStyles.stepContent}>
      <LimitsIllustration />
      <SectionHeading
        eyebrow={copy.eyebrow}
        title={copy.title}
        description={copy.description}
      />
      <View style={stepStyles.featureList}>
        <FeatureRow
          symbol="bell.badge.fill"
          title={copy.earlyTitle}
          description={copy.earlyDescription}
        />
        <FeatureRow
          delay={220}
          symbol="calendar"
          title={copy.periodTitle}
          description={copy.periodDescription}
        />
      </View>
      <Text style={stepStyles.smallNote}>{copy.note}</Text>
    </View>
  );
}
