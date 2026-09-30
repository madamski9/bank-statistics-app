import * as SecureStore from 'expo-secure-store';

const storageKey = 'bankstats.monthly-summary.reminder.v1';

export async function readMonthlySummaryReminder(): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(storageKey)) === 'true';
  } catch {
    return false;
  }
}

export async function writeMonthlySummaryReminder(isEnabled: boolean): Promise<void> {
  await SecureStore.setItemAsync(storageKey, isEnabled ? 'true' : 'false');
}

export function clearMonthlySummaryPreference(): Promise<void> {
  return SecureStore.deleteItemAsync(storageKey);
}
