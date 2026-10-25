import { useAuth } from '@clerk/expo';
import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useState, type ReactNode } from 'react';

import { LoadingScreen } from '@/features/app-shell/brand/loading-screen';
import { readWhenUnlocked } from '@/features/app-shell/keychain/keychain-readiness';
import { keychainRetry } from '@/features/app-shell/keychain/keychain-retry';

import { createOnboardingCompletion } from './onboarding-completion';
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

    void readWhenUnlocked(() => onboardingCompletion.isCompleted(userId), keychainRetry).then((result) => {
      if (isActive) {
        setState({ userId, completed: result.status === 'unavailable' || result.value });
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
      flow={replay === 'shortcuts' ? 'shortcuts' : 'full'}
      onCancel={finishOnboardingReplay}
      onComplete={finish}
    />
  );
}
