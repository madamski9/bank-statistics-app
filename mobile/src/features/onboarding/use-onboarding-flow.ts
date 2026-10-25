import { useCallback, useRef, useState } from 'react';
import { Linking, type ScrollView } from 'react-native';

import { useCopy } from '@/features/app-shell/localization/language';
import { usePremiumOffer } from '@/features/settings/premium/store/use-premium-offer';
import { biometricLabels } from '@/features/settings/privacy/app-lock/biometrics';
import { usePrivacy } from '@/features/settings/privacy/privacy-provider';

import type { FooterAction } from './components/onboarding-footer';
import { onboardingCopy } from './onboarding-copy';
import {
  automationStep,
  banksStep,
  canSkipFrom,
  flowSteps,
  focusIntroStep,
  focusSetupStep,
  iosUpdateStep,
  pinStep,
  plansStep,
  setsUpCapture,
  shortcutsIntroStep,
  skipTarget,
  stepAfter,
  stepBefore,
  stepCount,
  type OnboardingFlow,
} from './onboarding-steps';
import { useShortcutSetup } from './shortcut-setup/use-shortcut-setup';
import type { OnboardingPlan } from './steps/plans-step';

const shortcutsAppUrl = 'shortcuts://';

export interface OnboardingFlowOptions {
  flow: OnboardingFlow;
  onCancel: () => void;
  onComplete: (selectedBanks: string[]) => Promise<void>;
}

export function useOnboardingFlow({ flow, onCancel, onComplete }: OnboardingFlowOptions) {
  const copy = useCopy(onboardingCopy);
  const { biometric, changePin, updateSettings } = usePrivacy();
  const isShortcutsFlow = flow === 'shortcuts';
  const steps = flowSteps(flow);
  const [step, setStep] = useState(steps[0]);
  const [transitionDirection, setTransitionDirection] = useState<'forward' | 'backward'>('forward');
  const [error, setError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<OnboardingPlan>('free');
  const [isFinishing, setIsFinishing] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const premiumOffer = usePremiumOffer('trial');
  const premiumPlans = premiumOffer.state.kind === 'ready' ? premiumOffer.state.plans : [];
  const selectedPremiumPlan = premiumPlans.find((plan) => plan.period === selectedPlan);
  const scrollRef = useRef<ScrollView>(null);
  const capturesTransactions = setsUpCapture(flow);
  const resumeAtBanks = useCallback(() => {
    if (capturesTransactions) {
      setStep(banksStep);
    }
  }, [capturesTransactions]);
  const shortcut = useShortcutSetup({ isShortcutsFlow, onError: setError, onResume: resumeAtBanks });
  const { leave: leaveShortcutSetup, openShortcut, selectedBanks } = shortcut;
  const flowLength = steps.filter((candidate) => candidate !== stepCount).length;
  const flowPosition = Math.min(steps.indexOf(step) + 1, flowLength);

  const changeStep = useCallback(
    (next: number) => {
      setError(null);
      setTransitionDirection(next >= step ? 'forward' : 'backward');
      setStep(next);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    },
    [step],
  );

  const leaveTo = useCallback(
    (nextStep: number | null) =>
      leaveShortcutSetup(() => (nextStep === null ? onCancel() : changeStep(nextStep))),
    [changeStep, leaveShortcutSetup, onCancel],
  );

  const finish = useCallback(async () => {
    setIsFinishing(true);
    setError(null);

    try {
      await onComplete(capturesTransactions ? selectedBanks : []);
    } catch {
      setError(copy.finishFailed);
      setIsFinishing(false);
    }
  }, [capturesTransactions, copy, onComplete, selectedBanks]);

  const protectWithPin = useCallback(
    async (pin: string) => {
      await changePin(pin);
      await updateSettings({ isLockEnabled: true });
      changeStep(stepCount);
    },
    [changePin, changeStep, updateSettings],
  );

  const selectPlan = useCallback((plan: OnboardingPlan) => {
    setSelectedPlan(plan);
    setError(null);
  }, []);

  const buyPremium = useCallback(async () => {
    if (premiumOffer.state.kind === 'unavailable') {
      setError(copy.premiumSoon);
      return;
    }

    if (premiumOffer.state.kind === 'failed') {
      setError(copy.plansFailed);
      premiumOffer.reload();
      return;
    }

    if (selectedPremiumPlan === undefined) {
      return;
    }

    setError(null);
    setIsPurchasing(true);
    const outcome = await premiumOffer.purchase(selectedPremiumPlan);
    setIsPurchasing(false);

    if (outcome === 'purchased') {
      changeStep(stepAfter(flowSteps(flow), plansStep));
    } else if (outcome === 'failed') {
      setError(copy.purchaseFailed);
    }
  }, [changeStep, copy, flow, premiumOffer, selectedPremiumPlan]);

  const goBack = useCallback(() => {
    if (isShortcutsFlow && step === banksStep) {
      void leaveTo(null);
    } else {
      changeStep(stepBefore(flowSteps(flow), step));
    }
  }, [changeStep, flow, isShortcutsFlow, leaveTo, step]);

  const skip = useCallback(() => changeStep(skipTarget(flow)), [changeStep, flow]);

  const isBusy =
    isFinishing ||
    isPurchasing ||
    shortcut.isOpeningShortcut ||
    shortcut.isSavingProgress ||
    (step === plansStep && selectedPlan !== 'free' && premiumOffer.state.kind === 'loading');
  const isPrimaryDisabled = isBusy || (step === banksStep && selectedBanks.length === 0);

  const primaryLabel =
    step === iosUpdateStep
      ? copy.continueWithoutCapture
      : step === plansStep
      ? selectedPlan === 'free'
        ? copy.continueFree
        : selectedPremiumPlan?.trialDays != null
          ? copy.startTrial(selectedPremiumPlan.trialDays)
          : copy.goToPayment
      : step === shortcutsIntroStep
        ? copy.goToSetup
        : step === banksStep
          ? shortcut.hasOpenedShortcut ? copy.shortcutAdded : copy.addShortcut
          : step === automationStep
            ? copy.automationEnabled
            : step === focusIntroStep
              ? copy.showFocusSetup
              : step === focusSetupStep
                ? copy.focusConfigured
                : step === stepCount
                  ? copy.goToApp
                  : copy.next;
  const primaryAction =
    step === banksStep
      ? shortcut.hasOpenedShortcut ? () => leaveTo(automationStep) : openShortcut
      : step === stepCount || (isShortcutsFlow && step === focusSetupStep)
        ? finish
        : step === plansStep && selectedPlan !== 'free'
          ? buyPremium
          : () => changeStep(stepAfter(steps, step));

  const primary =
    step === pinStep
      ? null
      : {
          label: shortcut.isOpeningShortcut ? copy.openingShortcut : isBusy ? copy.saving : primaryLabel,
          isBusy,
          isDisabled: isPrimaryDisabled,
          onPress: () => void primaryAction(),
        };

  const secondaryActions: FooterAction[] = [
    ...(step === pinStep
      ? [{ key: 'not-now', label: copy.notNow, onPress: () => changeStep(stepCount) }]
      : []),
    ...(step === banksStep && shortcut.hasOpenedShortcut
      ? [{
          key: 'add-again',
          label: copy.addShortcutAgain,
          disabled: isBusy,
          busy: shortcut.isOpeningShortcut,
          onPress: () => void openShortcut(),
        }]
      : []),
    ...(step === banksStep
      ? [{
          key: 'set-up-later',
          label: copy.setUpLater,
          disabled: isBusy,
          onPress: () => void leaveTo(isShortcutsFlow ? null : pinStep),
        }]
      : []),
    ...(step === automationStep
      ? [{
          key: 'open-shortcuts',
          label: copy.openShortcuts,
          onPress: () => void Linking.openURL(shortcutsAppUrl).catch(() => undefined),
        }]
      : []),
  ];

  return {
    step,
    transitionDirection,
    error,
    selectedPlan,
    premiumPlans,
    sellsPremium: premiumOffer.state.kind !== 'unavailable',
    scrollRef,
    flowPosition,
    flowLength,
    capturesTransactions,
    canGoBack: (isShortcutsFlow || steps.indexOf(step) > 0) && step < stepCount,
    canSkip: !isShortcutsFlow && canSkipFrom(step),
    skip,
    isBusy,
    isRestoring: shortcut.isRestoring,
    selectedBanks,
    biometricName: biometric === 'none' ? null : biometricLabels[biometric],
    primary,
    secondaryActions,
    changeStep,
    goBack,
    selectPlan,
    toggleBank: shortcut.toggleBank,
    protectWithPin,
  };
}
