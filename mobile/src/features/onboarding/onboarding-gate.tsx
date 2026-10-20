import { useAuth } from '@clerk/expo';
import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { appEnvironment } from '@/app-environment';
import { LoadingScreen } from '@/features/app-shell/brand/loading-screen';

import { finishOnboardingReplay, useOnboardingReplay } from './onboarding-replay';
import { OnboardingScreen } from './onboarding-screen';
import { releaseNotesKey, shouldShowReleaseNotes } from './release-notes';
import { ReleaseNotesScreen } from './release-notes-screen';
import { banksKey } from './selected-banks';

interface OnboardingGateProps {
  children: ReactNode;
}

interface OnboardingState {
  userId: string;
  completed: boolean;
  hasSeenReleaseNotes: boolean;
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
      SecureStore.getItemAsync(releaseNotesKey(userId)).catch(() => null),
    ])
      .then(([completed, releaseNotes]) => {
        if (isActive) {
          setState({
            userId,
            completed: completed === 'true',
            hasSeenReleaseNotes: releaseNotes === 'true',
          });
        }
      })
      .catch(() => {
        if (isActive) {
          setState({ userId, completed: false, hasSeenReleaseNotes: false });
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
      await SecureStore.setItemAsync(releaseNotesKey(userId), 'true');
      setState({ userId, completed: true, hasSeenReleaseNotes: true });
      finishOnboardingReplay();
    },
    [userId],
  );

  const dismissReleaseNotes = useCallback(async () => {
    if (userId == null) {
      return;
    }

    setState({ userId, completed: true, hasSeenReleaseNotes: true });
    await SecureStore.setItemAsync(releaseNotesKey(userId), 'true').catch(() => undefined);
  }, [userId]);

  if (userId == null || state == null || state.userId !== userId) {
    return <LoadingScreen />;
  }

  if (replay === 'releaseNotes') {
    return (
      <ReleaseNotesScreen onClose={finishOnboardingReplay} />
    );
  }

  if (state.completed && replay === 'none') {
    const showsReleaseNotes = shouldShowReleaseNotes({
      hasCompletedOnboarding: state.completed,
      hasSeenReleaseNotes: state.hasSeenReleaseNotes,
      lane: appEnvironment.lane,
      platform: Platform.OS,
    });

    if (showsReleaseNotes) {
      return (
        <ReleaseNotesScreen onClose={() => void dismissReleaseNotes()} />
      );
    }

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
