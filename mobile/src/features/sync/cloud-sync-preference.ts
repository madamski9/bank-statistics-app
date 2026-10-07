import * as SecureStore from 'expo-secure-store';
import { useSyncExternalStore } from 'react';

import { waitForActiveSync } from './sync-activity';

const storageKey = 'bankstats.sync.cloud-enabled.v1';
const deviceOnly: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export type CloudSyncChoice = 'loading' | 'undecided' | 'enabled' | 'disabled';

let current: CloudSyncChoice = 'loading';
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

function publish(next: CloudSyncChoice): void {
  current = next;
  listeners.forEach((listener) => listener());
}

export function choiceFrom(stored: string | null): CloudSyncChoice {
  if (stored === 'true') {
    return 'enabled';
  }

  return stored === 'false' ? 'disabled' : 'undecided';
}

function ensureLoaded(): void {
  if (current !== 'loading' || loading !== null) {
    return;
  }

  loading = SecureStore.getItemAsync(storageKey, deviceOnly)
    .then((stored) => publish(choiceFrom(stored)))
    .catch(() => publish('undecided'))
    .finally(() => {
      loading = null;
    });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  ensureLoaded();

  return () => {
    listeners.delete(listener);
  };
}

export function useCloudSyncChoice(): CloudSyncChoice {
  return useSyncExternalStore(subscribe, () => current);
}

export function useCloudSyncEnabled(): boolean | null {
  const choice = useCloudSyncChoice();

  return choice === 'loading' ? null : choice === 'enabled';
}

export function isCloudSyncEnabledNow(): boolean {
  return current === 'enabled';
}

export async function setCloudSyncEnabled(isEnabled: boolean): Promise<void> {
  await SecureStore.setItemAsync(storageKey, isEnabled ? 'true' : 'false', deviceOnly);
  publish(isEnabled ? 'enabled' : 'disabled');

  if (!isEnabled) {
    await waitForActiveSync();
  }
}

export async function clearCloudSyncPreference(): Promise<void> {
  await SecureStore.deleteItemAsync(storageKey, deviceOnly);
  publish('undecided');
}
