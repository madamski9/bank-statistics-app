import { Platform, View } from 'react-native';

import { useCopy } from '@/features/app-shell/localization/language';

import { FeatureRow } from '../components/feature-row';
import { SectionHeading } from '../components/section-heading';
import { stepStyles } from '../components/step-styles';
import { Ios27Badge } from '../illustrations/ios-27-badge';
import { onboardingCopy } from '../onboarding-copy';

export function IosUpdateStep() {
  const copy = useCopy(onboardingCopy).iosUpdate;

  return (
    <View style={stepStyles.stepContent}>
      <Ios27Badge />
      <SectionHeading eyebrow={copy.eyebrow} title={copy.title} description={copy.description} />
      <View style={stepStyles.featureList}>
        <FeatureRow
          symbol="iphone"
          title={copy.currentVersion(String(Platform.Version))}
          description={copy.updateHint}
        />
        <FeatureRow
          delay={220}
          symbol="square.and.pencil"
          title={copy.withoutCaptureTitle}
          description={copy.withoutCaptureText}
        />
      </View>
    </View>
  );
}
