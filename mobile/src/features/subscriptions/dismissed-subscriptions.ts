import * as SecureStore from 'expo-secure-store';

const storageKey = 'bankstats.subscriptions.dismissed.v1';

export async function readDismissedSubscriptions(): Promise<string[]> {
  try {
    const stored = await SecureStore.getItemAsync(storageKey);
    const parsed: unknown = stored === null ? [] : JSON.parse(stored);

    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : [];
  } catch {
    return [];
  }
}

export async function writeDismissedSubscriptions(keys: string[]): Promise<void> {
  await SecureStore.setItemAsync(storageKey, JSON.stringify(keys));
}

export function clearDismissedSubscriptions(): Promise<void> {
  return SecureStore.deleteItemAsync(storageKey);
}
