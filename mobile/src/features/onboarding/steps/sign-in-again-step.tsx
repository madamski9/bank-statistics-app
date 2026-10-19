import { useClerk } from '@clerk/expo';
import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';

import { useCopy } from '@/features/app-shell/localization/language';

import { SectionHeading } from '../components/section-heading';
import { stepStyles } from '../components/step-styles';
import { SecurityIllustration } from '../illustrations/security-illustration';
import { onboardingCopy } from '../onboarding-copy';

export function useSignOutNow(onSigningOut: () => Promise<void>) {
  const copy = useCopy(onboardingCopy).sessionAnnouncement;
  const { signOut } = useClerk();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signOutNow = useCallback(async () => {
    setError(null);
    setIsSigningOut(true);

    try {
      await onSigningOut();
      await signOut();
    } catch {
      setError(copy.signOutFailed);
      setIsSigningOut(false);
    }
  }, [copy.signOutFailed, onSigningOut, signOut]);

  return { error, isSigningOut, signOutNow };
}

export function SignInAgainStep() {
  const copy = useCopy(onboardingCopy).sessionAnnouncement;

  return (
    <View style={stepStyles.stepContent}>
      <SecurityIllustration />
      <SectionHeading eyebrow={copy.eyebrow} title={copy.title} description={copy.description} />
      <Text style={stepStyles.smallNote}>{copy.note}</Text>
    </View>
  );
}
