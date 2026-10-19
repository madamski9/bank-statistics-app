import { StatusBar } from 'expo-status-bar';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCopy } from '@/features/app-shell/localization/language';
import { AnimatedReveal } from '@/features/app-shell/motion/animated-reveal';
import { overviewColors, overviewSpacing } from '@/features/app-shell/theme/overview-theme';

import { OnboardingFooter } from './components/onboarding-footer';
import { OnboardingTopBar } from './components/onboarding-top-bar';
import { onboardingCopy } from './onboarding-copy';
import { ReleaseNotesStep } from './steps/release-notes-step';

interface ReleaseNotesScreenProps {
  onClose: () => void;
}

export function ReleaseNotesScreen({ onClose }: ReleaseNotesScreenProps) {
  const copy = useCopy(onboardingCopy);
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <OnboardingTopBar
        canGoBack
        canSkip={false}
        isBusy={false}
        onBack={onClose}
        onSkip={onClose}
        stepLabel={copy.releaseNotes.version}
      />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingLeft: Math.max(insets.left, 20), paddingRight: Math.max(insets.right, 20) }]}
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
      >
        <AnimatedReveal direction="right" distance={18} duration={320} style={styles.page}>
          <ReleaseNotesStep />
        </AnimatedReveal>
      </ScrollView>
      <OnboardingFooter
        error={null}
        primary={{ label: copy.done, isBusy: false, isDisabled: false, onPress: onClose }}
        secondaryActions={[]}
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
    paddingTop: 28,
    paddingBottom: 28,
  },
  page: { width: '100%' },
});
