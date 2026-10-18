import * as SecureStore from 'expo-secure-store';

const readableWhileLocked: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

export const tokenCache = {
  async getToken(key: string) {
    try {
      return await SecureStore.getItemAsync(key, readableWhileLocked);
    } catch {
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      await SecureStore.deleteItemAsync(key, readableWhileLocked);
      await SecureStore.setItemAsync(key, value, readableWhileLocked);
    } catch {}
  },
  async clearToken(key: string) {
    try {
      await SecureStore.deleteItemAsync(key, readableWhileLocked);
    } catch {}
  },
};
