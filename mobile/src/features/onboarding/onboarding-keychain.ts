import * as SecureStore from 'expo-secure-store';

export const readableWhileLocked: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};
