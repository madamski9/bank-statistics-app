import { StatusBar } from 'expo-status-bar';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LoadingScreen } from '@/features/app-shell/brand/loading-screen';
import { useCopy } from '@/features/app-shell/localization/language';
import { AnimatedReveal } from '@/features/app-shell/motion/animated-reveal';
import { overviewColors, overviewSpacing } from '@/features/app-shell/theme/overview-theme';

import { OnboardingFooter } from './components/onboarding-footer';
import { OnboardingProgress } from './components/onboarding-progress';
import { OnboardingTopBar } from './components/onboarding-top-bar';
import { onboardingCopy } from './onboarding-copy';
import {
  automationStep,
  banksStep,
  focusIntroStep,
  focusSetupStep,
  iosUpdateStep,
  pinStep,
  plansStep,
  shortcutsIntroStep,
  stepCount,
} from './onboarding-steps';
import { isWalletOnly } from './shortcut-setup/shortcut-links';
import { AutomationStep } from './steps/automation-step';
import { BanksStep } from './steps/banks-step';
import { CompletionStep } from './steps/completion-step';
import { FocusIntroStep } from './steps/focus-intro-step';
import { FocusSetupStep } from './steps/focus-setup-step';
import { IosUpdateStep } from './steps/ios-update-step';
import { LimitsStep } from './steps/limits-step';
import { PinStep } from './steps/pin-step';
import { PlansStep } from './steps/plans-step';
import { ShortcutsStep } from './steps/shortcuts-step';
import { WelcomeStep } from './steps/welcome-step';
import { useOnboardingFlow, type OnboardingFlowOptions } from './use-onboarding-flow';

export function OnboardingScreen(props: OnboardingFlowOptions) {
  const copy = useCopy(onboardingCopy);
  const insets = useSafeAreaInsets();
  const { scrollRef, ...onboarding } = useOnboardingFlow(props);
  const capturesWalletOnly = isWalletOnly(onboarding.selectedBanks);
  const { step } = onboarding;

  if (onboarding.isRestoring) {
    return <LoadingScreen />;
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <OnboardingTopBar
        canGoBack={onboarding.canGoBack}
        canSkip={onboarding.canSkip}
        isBusy={onboarding.isBusy}
        onBack={onboarding.goBack}
        onSkip={onboarding.skip}
        stepLabel={step < stepCount ? `${onboarding.flowPosition} / ${onboarding.flowLength}` : copy.done}
      />
      <OnboardingProgress length={onboarding.flowLength} position={onboarding.flowPosition} />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingLeft: Math.max(insets.left, 20), paddingRight: Math.max(insets.right, 20) }]}
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
      >
        <AnimatedReveal
          direction={onboarding.transitionDirection === 'forward' ? 'right' : 'left'}
          distance={18}
          duration={320}
          key={step}
          style={styles.page}
        >
          {step === iosUpdateStep ? <IosUpdateStep /> : null}
          {step === 0 ? <WelcomeStep /> : null}
          {step === 1 ? <LimitsStep /> : null}
          {step === plansStep ? (
            <PlansStep
              onSelect={onboarding.selectPlan}
              premiumPlans={onboarding.premiumPlans}
              selectedPlan={onboarding.selectedPlan}
              sellsPremium={onboarding.sellsPremium}
            />
          ) : null}
          {step === shortcutsIntroStep ? <ShortcutsStep /> : null}
          {step === banksStep ? (
            <BanksStep
              disabled={onboarding.isBusy}
              onToggle={onboarding.toggleBank}
              selectedBanks={onboarding.selectedBanks}
            />
          ) : null}
          {step === automationStep ? <AutomationStep isWalletOnly={capturesWalletOnly} /> : null}
          {step === focusIntroStep ? <FocusIntroStep isWalletOnly={capturesWalletOnly} /> : null}
          {step === focusSetupStep ? <FocusSetupStep isWalletOnly={capturesWalletOnly} /> : null}
          {step === pinStep ? (
            <PinStep biometricName={onboarding.biometricName} onComplete={onboarding.protectWithPin} />
          ) : null}
          {step === stepCount ? <CompletionStep capturesTransactions={onboarding.capturesTransactions} /> : null}
        </AnimatedReveal>
      </ScrollView>

      <OnboardingFooter
        error={onboarding.error}
        primary={onboarding.primary}
        secondaryActions={onboarding.secondaryActions}
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
