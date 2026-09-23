import * as SecureStore from 'expo-secure-store';

import type { AlertStorage } from './alert-storage';

const keys = {
  rules: 'bankstats.alert-rules',
  ledger: 'bankstats.alert-ledger',
} as const;

export const secureAlertStorage: AlertStorage = {
  read: (key) => SecureStore.getItemAsync(keys[key]),
  write: (key, value) => SecureStore.setItemAsync(keys[key], value),
};
