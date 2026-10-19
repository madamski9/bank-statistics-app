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
import { AlertToneNotesStep, SignOutFixNotesStep } from './steps/release-notes-step';

const pageCount = 2;

interface ReleaseNotesScreenProps {
  onClose: () => void;
}

export function ReleaseNotesScreen({ onClose }: ReleaseNotesScreenProps) {
  const copy = useCopy(onboardingCopy);
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(1);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const isLastPage = page === pageCount;

  const changePage = (next: number) => {
    setDirection(next > page ? 'forward' : 'backward');
    setPage(next);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <OnboardingTopBar
        canGoBack
        canSkip={false}
        isBusy={false}
        onBack={() => (page > 1 ? changePage(page - 1) : onClose())}
        onSkip={onClose}
        stepLabel={`${page} / ${pageCount}`}
      />
      <OnboardingProgress length={pageCount} position={page} />
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
          {page === 1 ? <AlertToneNotesStep /> : <SignOutFixNotesStep />}
        </AnimatedReveal>
      </ScrollView>
      <OnboardingFooter
        error={null}
        primary={{
          label: isLastPage ? copy.done : copy.next,
          isBusy: false,
          isDisabled: false,
          onPress: isLastPage ? onClose : () => changePage(page + 1),
        }}
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
