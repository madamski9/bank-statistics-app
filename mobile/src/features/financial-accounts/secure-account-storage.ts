import * as SecureStore from 'expo-secure-store';

import type { AccountStorage } from './account-storage';

const accountsKey = 'bankstats.financial-accounts';

export const secureAccountStorage: AccountStorage = {
  read: () => SecureStore.getItemAsync(accountsKey),
  write: (value) => SecureStore.setItemAsync(accountsKey, value),
};

export function clearAccountStorage(): Promise<void> {
  return SecureStore.deleteItemAsync(accountsKey);
}
