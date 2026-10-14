import { useAuth } from '@clerk/expo';
import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useState, type ReactNode } from 'react';

import { LoadingScreen } from '@/features/brand/loading-screen';

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

function completedKey(userId: string): string {
  return `bankstats.onboarding.v1.${userId}`;
}

export function OnboardingGate({ children }: OnboardingGateProps) {
  const { userId } = useAuth();
  const [state, setState] = useState<OnboardingState | null>(null);
  const replay = useOnboardingReplay();

  useEffect(() => {
    if (userId == null) {
      return;
    }

    let isActive = true;

    void SecureStore.getItemAsync(completedKey(userId))
      .then((value) => {
        if (isActive) {
          setState({ userId, completed: value === 'true' });
        }
      })
      .catch(() => {
        if (isActive) {
          setState({ userId, completed: false });
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
      await SecureStore.setItemAsync(completedKey(userId), 'true');
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
