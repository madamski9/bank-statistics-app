import * as SecureStore from 'expo-secure-store';

export function banksKey(userId: string): string {
  return `bankstats.onboarding.banks.v1.${userId}`;
}

export async function readSelectedBanks(userId: string): Promise<string[]> {
  try {
    const stored = await SecureStore.getItemAsync(banksKey(userId));
    const parsed: unknown = stored === null ? [] : JSON.parse(stored);

    return Array.isArray(parsed) ? parsed.filter((bank): bank is string => typeof bank === 'string') : [];
  } catch {
    return [];
  }
}
