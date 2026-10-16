import { useAuth } from '@clerk/expo';
import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { appEnvironment } from '@/app-environment';
import { LoadingScreen } from '@/features/app-shell/brand/loading-screen';

import { focusAnnouncementKey, shouldShowFocusAnnouncement } from './focus-announcement';
import { finishOnboardingReplay, useOnboardingReplay } from './onboarding-replay';
import { OnboardingScreen } from './onboarding-screen';
import { banksKey } from './selected-banks';

interface OnboardingGateProps {
  children: ReactNode;
}

interface OnboardingState {
  userId: string;
  completed: boolean;
  hasSeenFocusAnnouncement: boolean;
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

    void Promise.all([
      SecureStore.getItemAsync(completedKey(userId)),
      SecureStore.getItemAsync(focusAnnouncementKey(userId)).catch(() => null),
    ])
      .then(([completed, focusAnnouncement]) => {
        if (isActive) {
          setState({
            userId,
            completed: completed === 'true',
            hasSeenFocusAnnouncement: focusAnnouncement === 'true',
          });
        }
      })
      .catch(() => {
        if (isActive) {
          setState({ userId, completed: false, hasSeenFocusAnnouncement: false });
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
      await SecureStore.setItemAsync(focusAnnouncementKey(userId), 'true');
      setState({ userId, completed: true, hasSeenFocusAnnouncement: true });
      finishOnboardingReplay();
    },
    [userId],
  );

  const dismissFocusAnnouncement = useCallback(async () => {
    if (userId == null) {
      return;
    }

    setState({ userId, completed: true, hasSeenFocusAnnouncement: true });
    await SecureStore.setItemAsync(focusAnnouncementKey(userId), 'true').catch(() => undefined);
  }, [userId]);

  if (userId == null || state == null || state.userId !== userId) {
    return <LoadingScreen />;
  }

  if (state.completed && replay === 'none') {
    const showsFocusAnnouncement = shouldShowFocusAnnouncement({
      hasCompletedOnboarding: state.completed,
      hasSeenAnnouncement: state.hasSeenFocusAnnouncement,
      lane: appEnvironment.lane,
      platform: Platform.OS,
    });

    if (!showsFocusAnnouncement) {
      return children;
    }

    return (
      <OnboardingScreen
        flow="focus"
        onCancel={() => void dismissFocusAnnouncement()}
        onComplete={dismissFocusAnnouncement}
      />
    );
  }

  return (
    <OnboardingScreen
      flow={replay === 'shortcuts' ? 'shortcuts' : 'full'}
      onCancel={finishOnboardingReplay}
      onComplete={finish}
    />
  );
}
