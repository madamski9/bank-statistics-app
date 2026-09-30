import * as SecureStore from 'expo-secure-store';
import { useSyncExternalStore } from 'react';

const storageKey = 'bankstats.sync.cloud-enabled.v1';
const deviceOnly: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

type Preference = boolean | null;

let current: Preference = null;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

function publish(next: Preference): void {
  current = next;
  listeners.forEach((listener) => listener());
}

function ensureLoaded(): void {
  if (current !== null || loading !== null) {
    return;
  }

  loading = SecureStore.getItemAsync(storageKey, deviceOnly)
    .then((stored) => publish(stored !== 'false'))
    .catch(() => publish(true))
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

export function useCloudSyncEnabled(): Preference {
  return useSyncExternalStore(subscribe, () => current);
}

export async function setCloudSyncEnabled(isEnabled: boolean): Promise<void> {
  await SecureStore.setItemAsync(storageKey, isEnabled ? 'true' : 'false', deviceOnly);
  publish(isEnabled);
}

export async function clearCloudSyncPreference(): Promise<void> {
  await SecureStore.deleteItemAsync(storageKey, deviceOnly);
  publish(true);
}
