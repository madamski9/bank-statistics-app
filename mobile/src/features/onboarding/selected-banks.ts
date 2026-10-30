import * as SecureStore from 'expo-secure-store';

import { banksKey } from './selected-banks-key';

export async function readSelectedBanks(userId: string): Promise<string[]> {
  try {
    const stored = await SecureStore.getItemAsync(banksKey(userId));
    const parsed: unknown = stored === null ? [] : JSON.parse(stored);

    return Array.isArray(parsed) ? parsed.filter((bank): bank is string => typeof bank === 'string') : [];
  } catch {
    return [];
  }
}
