import { useAuth, useSession } from '@clerk/expo';
import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { appEnvironment } from '@/app-environment';
import { LoadingScreen } from '@/features/app-shell/brand/loading-screen';

import { finishOnboardingReplay, useOnboardingReplay } from './onboarding-replay';
import { OnboardingScreen } from './onboarding-screen';
import { releaseNotesKey, shouldShowReleaseNotes } from './release-notes';
import { ReleaseNotesScreen } from './release-notes-screen';
import { sessionAnnouncementKey, shouldShowSessionAnnouncement } from './session-announcement';
import { SessionAnnouncementScreen } from './session-announcement-screen';
import { banksKey } from './selected-banks';

interface OnboardingGateProps {
  children: ReactNode;
}

interface OnboardingState {
  userId: string;
  completed: boolean;
  hasSeenReleaseNotes: boolean;
  hasSeenSessionAnnouncement: boolean;
}

function completedKey(userId: string): string {
  return `bankstats.onboarding.v1.${userId}`;
}

export function OnboardingGate({ children }: OnboardingGateProps) {
  const { userId } = useAuth();
  const { session } = useSession();
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
      SecureStore.getItemAsync(sessionAnnouncementKey(userId)).catch(() => null),
    ])
      .then(([completed, releaseNotes, sessionAnnouncement]) => {
        if (isActive) {
          setState({
            userId,
            completed: completed === 'true',
            hasSeenReleaseNotes: releaseNotes === 'true',
            hasSeenSessionAnnouncement: sessionAnnouncement === 'true',
          });
        }
      })
      .catch(() => {
        if (isActive) {
          setState({
            userId,
            completed: false,
            hasSeenReleaseNotes: false,
            hasSeenSessionAnnouncement: false,
          });
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
      setState((current) => ({
        userId,
        completed: true,
        hasSeenReleaseNotes: true,
        hasSeenSessionAnnouncement: current?.hasSeenSessionAnnouncement ?? false,
      }));
      finishOnboardingReplay();
    },
    [userId],
  );

  const dismissReleaseNotes = useCallback(async () => {
    if (userId == null) {
      return;
    }

    setState((current) => ({
      userId,
      completed: true,
      hasSeenReleaseNotes: true,
      hasSeenSessionAnnouncement: current?.hasSeenSessionAnnouncement ?? false,
    }));
    await SecureStore.setItemAsync(releaseNotesKey(userId), 'true').catch(() => undefined);
  }, [userId]);

  const dismissSessionAnnouncement = useCallback(async () => {
    if (userId == null) {
      return;
    }

    setState((current) => ({
      userId,
      completed: true,
      hasSeenReleaseNotes: current?.hasSeenReleaseNotes ?? true,
      hasSeenSessionAnnouncement: true,
    }));
    await SecureStore.setItemAsync(sessionAnnouncementKey(userId), 'true').catch(() => undefined);
  }, [userId]);

  const dismissAnnouncements = useCallback(async () => {
    if (userId == null) {
      return;
    }

    setState({ userId, completed: true, hasSeenReleaseNotes: true, hasSeenSessionAnnouncement: true });
    await Promise.all([
      SecureStore.setItemAsync(releaseNotesKey(userId), 'true').catch(() => undefined),
      SecureStore.setItemAsync(sessionAnnouncementKey(userId), 'true').catch(() => undefined),
    ]);
  }, [userId]);

  if (userId == null || state == null || state.userId !== userId) {
    return <LoadingScreen />;
  }

  if (replay === 'session') {
    return (
      <SessionAnnouncementScreen
        onLater={finishOnboardingReplay}
        onSigningOut={async () => finishOnboardingReplay()}
      />
    );
  }

  if (replay === 'releaseNotes') {
    return (
      <ReleaseNotesScreen
        includesSignInAgain
        onClose={finishOnboardingReplay}
        onLater={finishOnboardingReplay}
        onSigningOut={async () => finishOnboardingReplay()}
      />
    );
  }

  if (state.completed && replay === 'none') {
    const showsReleaseNotes = shouldShowReleaseNotes({
      hasCompletedOnboarding: state.completed,
      hasSeenReleaseNotes: state.hasSeenReleaseNotes,
      lane: appEnvironment.lane,
      platform: Platform.OS,
    });

    const showsSessionAnnouncement = shouldShowSessionAnnouncement({
      hasCompletedOnboarding: state.completed,
      hasSeenAnnouncement: state.hasSeenSessionAnnouncement,
      lane: appEnvironment.lane,
      session,
    });

    if (showsReleaseNotes) {
      return (
        <ReleaseNotesScreen
          includesSignInAgain={showsSessionAnnouncement}
          onClose={() => void dismissReleaseNotes()}
          onLater={() => void dismissAnnouncements()}
          onSigningOut={dismissAnnouncements}
        />
      );
    }

    if (showsSessionAnnouncement) {
      return (
        <SessionAnnouncementScreen
          onLater={() => void dismissSessionAnnouncement()}
          onSigningOut={dismissSessionAnnouncement}
        />
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
