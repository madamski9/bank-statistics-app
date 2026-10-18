import { useClerk } from '@clerk/expo';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCopy } from '@/features/app-shell/localization/language';
import { overviewColors, overviewSpacing } from '@/features/app-shell/theme/overview-theme';

import { OnboardingFooter } from './components/onboarding-footer';
import { SectionHeading } from './components/section-heading';
import { stepStyles } from './components/step-styles';
import { SecurityIllustration } from './illustrations/security-illustration';
import { onboardingCopy } from './onboarding-copy';

interface SessionAnnouncementScreenProps {
  onSigningOut: () => Promise<void>;
  onLater: () => void;
}

export function SessionAnnouncementScreen({ onSigningOut, onLater }: SessionAnnouncementScreenProps) {
  const copy = useCopy(onboardingCopy).sessionAnnouncement;
  const insets = useSafeAreaInsets();
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

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 28, paddingLeft: Math.max(insets.left, 20), paddingRight: Math.max(insets.right, 20) },
        ]}
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
      >
        <View style={stepStyles.stepContent}>
          <SecurityIllustration />
          <SectionHeading eyebrow={copy.eyebrow} title={copy.title} description={copy.description} />
          <Text style={stepStyles.smallNote}>{copy.note}</Text>
        </View>
      </ScrollView>
      <OnboardingFooter
        error={error}
        primary={{ label: copy.signOut, isBusy: isSigningOut, isDisabled: isSigningOut, onPress: () => void signOutNow() }}
        secondaryActions={[{ key: 'later', label: copy.later, disabled: isSigningOut, onPress: onLater }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: overviewColors.background },
  scroll: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: overviewSpacing.gutter,
    paddingBottom: 28,
  },
});
