import { useCallback, useRef, useState } from 'react';
import { Linking, type ScrollView } from 'react-native';

import { useCopy } from '@/features/app-shell/localization/language';
import { biometricLabels } from '@/features/settings/privacy/app-lock/biometrics';
import { usePrivacy } from '@/features/settings/privacy/privacy-provider';

import type { FooterAction } from './components/onboarding-footer';
import { onboardingCopy } from './onboarding-copy';
import {
  automationStep,
  banksStep,
  focusIntroStep,
  focusSetupStep,
  pinStep,
  plansStep,
  shortcutsIntroStep,
  stepCount,
} from './onboarding-steps';
import { useShortcutSetup } from './shortcut-setup/use-shortcut-setup';
import type { OnboardingPlan } from './steps/plans-step';

const shortcutsAppUrl = 'shortcuts://';

export interface OnboardingFlowOptions {
  flow: 'full' | 'shortcuts';
  onCancel: () => void;
  onComplete: (selectedBanks: string[]) => Promise<void>;
}

export function useOnboardingFlow({ flow, onCancel, onComplete }: OnboardingFlowOptions) {
  const copy = useCopy(onboardingCopy);
  const { biometric, changePin, updateSettings } = usePrivacy();
  const isShortcutsFlow = flow === 'shortcuts';
  const flowStart = isShortcutsFlow ? banksStep : 0;
  const [step, setStep] = useState(flowStart);
  const [transitionDirection, setTransitionDirection] = useState<'forward' | 'backward'>('forward');
  const [error, setError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<OnboardingPlan>('free');
  const [isFinishing, setIsFinishing] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const resumeAtBanks = useCallback(() => setStep(banksStep), []);
  const shortcut = useShortcutSetup({ isShortcutsFlow, onError: setError, onResume: resumeAtBanks });
  const { leave: leaveShortcutSetup, openShortcut, selectedBanks } = shortcut;
  const flowLength = isShortcutsFlow ? focusSetupStep - flowStart + 1 : stepCount;
  const flowPosition = Math.min(step - flowStart + 1, flowLength);

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
      await onComplete(selectedBanks);
    } catch {
      setError(copy.finishFailed);
      setIsFinishing(false);
    }
  }, [copy, onComplete, selectedBanks]);

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

  const goBack = useCallback(() => {
    if (isShortcutsFlow && step === banksStep) {
      void leaveTo(null);
    } else {
      changeStep(step - 1);
    }
  }, [changeStep, isShortcutsFlow, leaveTo, step]);

  const isBusy = isFinishing || shortcut.isOpeningShortcut || shortcut.isSavingProgress;
  const isPrimaryDisabled = isBusy || (step === banksStep && selectedBanks.length === 0);

  const primaryLabel =
    step === plansStep
      ? selectedPlan === 'free'
        ? copy.continueFree
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
        : step === plansStep && selectedPlan === 'premium'
          ? () =>
              setError(copy.premiumSoon)
          : () => changeStep(step + 1);

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
    scrollRef,
    flowPosition,
    flowLength,
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
