import { useSyncExternalStore } from 'react';

let isReplayingOnboarding = false;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

function setReplayingOnboarding(isReplaying: boolean): void {
  isReplayingOnboarding = isReplaying;
  listeners.forEach((listener) => listener());
}

export function replayOnboarding(): void {
  setReplayingOnboarding(true);
}

export function finishOnboardingReplay(): void {
  setReplayingOnboarding(false);
}

export function useOnboardingReplay(): boolean {
  return useSyncExternalStore(subscribe, () => isReplayingOnboarding);
}
