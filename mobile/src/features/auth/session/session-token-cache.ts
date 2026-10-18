import type { SecureStoreOptions } from 'expo-secure-store';

export interface KeychainStore {
  getItemAsync: (key: string, options?: SecureStoreOptions) => Promise<string | null>;
  setItemAsync: (key: string, value: string, options?: SecureStoreOptions) => Promise<void>;
  deleteItemAsync: (key: string, options?: SecureStoreOptions) => Promise<void>;
}

export function createSessionTokenCache(store: KeychainStore, readableWhileLocked: SecureStoreOptions) {
  async function readSafely(key: string, options?: SecureStoreOptions): Promise<string | null> {
    try {
      return await store.getItemAsync(key, options);
    } catch {
      return null;
    }
  }

  async function deleteSafely(key: string, options?: SecureStoreOptions): Promise<void> {
    try {
      await store.deleteItemAsync(key, options);
    } catch {}
  }

  return {
    async getToken(key: string) {
      return (
        (await readSafely(key, readableWhileLocked)) ??
        (await readSafely(key)) ??
        (await readSafely(key, readableWhileLocked))
      );
    },
    async saveToken(key: string, value: string) {
      try {
        await store.setItemAsync(key, value, readableWhileLocked);
      } catch {
        return;
      }

      await deleteSafely(key);
    },
    async clearToken(key: string) {
      await deleteSafely(key, readableWhileLocked);
      await deleteSafely(key);
    },
  };
}
