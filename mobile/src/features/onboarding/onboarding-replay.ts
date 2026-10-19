import { useSyncExternalStore } from 'react';

export type OnboardingReplay = 'none' | 'full' | 'shortcuts' | 'releaseNotes' | 'session';

let onboardingReplay: OnboardingReplay = 'none';
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

function setOnboardingReplay(replay: OnboardingReplay): void {
  onboardingReplay = replay;
  listeners.forEach((listener) => listener());
}

export function replayOnboarding(): void {
  setOnboardingReplay('full');
}

export function replayShortcutsSetup(): void {
  setOnboardingReplay('shortcuts');
}

export function replayReleaseNotes(): void {
  setOnboardingReplay('releaseNotes');
}

export function replaySessionAnnouncement(): void {
  setOnboardingReplay('session');
}

export function finishOnboardingReplay(): void {
  setOnboardingReplay('none');
}

export function useOnboardingReplay(): OnboardingReplay {
  return useSyncExternalStore(subscribe, () => onboardingReplay);
}
