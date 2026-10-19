import { StatusBar } from 'expo-status-bar';
import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCopy } from '@/features/app-shell/localization/language';
import { AnimatedReveal } from '@/features/app-shell/motion/animated-reveal';
import { overviewColors, overviewSpacing } from '@/features/app-shell/theme/overview-theme';

import { OnboardingFooter } from './components/onboarding-footer';
import { OnboardingProgress } from './components/onboarding-progress';
import { OnboardingTopBar } from './components/onboarding-top-bar';
import { onboardingCopy } from './onboarding-copy';
import { SessionAnnouncementContent, useSignOutNow } from './session-announcement-screen';
import { AlertToneNotesStep } from './steps/release-notes-step';

interface ReleaseNotesScreenProps {
  includesSignInAgain: boolean;
  onClose: () => void;
  onLater: () => void;
  onSigningOut: () => Promise<void>;
}

export function ReleaseNotesScreen({ includesSignInAgain, onClose, onLater, onSigningOut }: ReleaseNotesScreenProps) {
  const copy = useCopy(onboardingCopy);
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(1);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const { error, isSigningOut, signOutNow } = useSignOutNow(onSigningOut);
  const pageCount = includesSignInAgain ? 2 : 1;
  const isSignInAgainPage = includesSignInAgain && page === 2;

  const changePage = (next: number) => {
    setDirection(next > page ? 'forward' : 'backward');
    setPage(next);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  const primary = isSignInAgainPage
    ? { label: copy.sessionAnnouncement.signOut, isBusy: isSigningOut, isDisabled: isSigningOut, onPress: () => void signOutNow() }
    : page < pageCount
      ? { label: copy.next, isBusy: false, isDisabled: false, onPress: () => changePage(page + 1) }
      : { label: copy.done, isBusy: false, isDisabled: false, onPress: onClose };

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <OnboardingTopBar
        canGoBack
        canSkip={false}
        isBusy={isSigningOut}
        onBack={() => (page > 1 ? changePage(page - 1) : onClose())}
        onSkip={onClose}
        stepLabel={pageCount > 1 ? `${page} / ${pageCount}` : copy.releaseNotes.version}
      />
      {pageCount > 1 ? <OnboardingProgress length={pageCount} position={page} /> : null}
      <ScrollView
        contentContainerStyle={[styles.content, { paddingLeft: Math.max(insets.left, 20), paddingRight: Math.max(insets.right, 20) }]}
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
      >
        <AnimatedReveal
          direction={direction === 'forward' ? 'right' : 'left'}
          distance={18}
          duration={320}
          key={page}
          style={styles.page}
        >
          {isSignInAgainPage ? <SessionAnnouncementContent /> : <AlertToneNotesStep />}
        </AnimatedReveal>
      </ScrollView>
      <OnboardingFooter
        error={isSignInAgainPage ? error : null}
        primary={primary}
        secondaryActions={
          isSignInAgainPage
            ? [{ key: 'later', label: copy.sessionAnnouncement.later, disabled: isSigningOut, onPress: onLater }]
            : []
        }
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
