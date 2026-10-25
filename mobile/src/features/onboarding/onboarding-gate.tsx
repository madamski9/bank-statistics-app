import { useAuth } from '@clerk/expo';
import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { LoadingScreen } from '@/features/app-shell/brand/loading-screen';
import { needsIosUpdateForCapture } from '@/features/app-shell/capture-support/device-capture-support';
import { readWhenUnlocked } from '@/features/app-shell/keychain/keychain-readiness';
import { keychainRetry } from '@/features/app-shell/keychain/keychain-retry';

import { completedAfterRead, createOnboardingCompletion } from './onboarding-completion';
import { onboardingFlow } from './onboarding-flow';
import { finishOnboardingReplay, useOnboardingReplay } from './onboarding-replay';
import { OnboardingScreen } from './onboarding-screen';
import { banksKey } from './selected-banks';

interface OnboardingGateProps {
  children: ReactNode;
}

interface OnboardingState {
  userId: string;
  completed: boolean;
}

const onboardingCompletion = createOnboardingCompletion(SecureStore, {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
});

export function OnboardingGate({ children }: OnboardingGateProps) {
  const { userId } = useAuth();
  const [state, setState] = useState<OnboardingState | null>(null);
  const replay = useOnboardingReplay();

  useEffect(() => {
    if (userId == null) {
      return;
    }

    let isActive = true;

    void readWhenUnlocked(
      () => onboardingCompletion.isCompleted(userId),
      keychainRetry,
      () => !isActive,
    ).then((result) => {
      if (isActive) {
        setState({ userId, completed: completedAfterRead(result, Platform.OS === 'ios') });
      }
    });

    return () => {
      isActive = false;
    };
  }, [userId]);

  const finish = useCallback(
    async (selectedBanks: string[]) => {
      if (userId == null) {
        return;
      }

      await SecureStore.setItemAsync(
        banksKey(userId),
        JSON.stringify(selectedBanks),
      );
      await onboardingCompletion.complete(userId);
      setState({ userId, completed: true });
      finishOnboardingReplay();
    },
    [userId],
  );

  if (userId == null || state == null || state.userId !== userId) {
    return <LoadingScreen />;
  }

  if (state.completed && replay === 'none') {
    return children;
  }

  return (
    <OnboardingScreen
      flow={onboardingFlow(replay, needsIosUpdateForCapture)}
      onCancel={finishOnboardingReplay}
      onComplete={finish}
    />
  );
}
