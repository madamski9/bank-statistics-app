import { useSyncExternalStore } from 'react';

let isPreviewingWithoutPremium = false;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function setPreviewWithoutPremium(isPreviewing: boolean): void {
  isPreviewingWithoutPremium = isPreviewing;
  listeners.forEach((listener) => listener());
}

export function usePreviewWithoutPremium(): boolean {
  return useSyncExternalStore(subscribe, () => isPreviewingWithoutPremium);
}
