import type { SecureStoreOptions } from 'expo-secure-store';
import { describe, expect, test } from 'bun:test';

import { createSessionTokenCache, type KeychainStore } from './session-token-cache';

const key = '__clerk_client_jwt';
const lockedReadable: SecureStoreOptions = { keychainService: 'bankstats.session', keychainAccessible: 1 };

function serializedKeychain(initial: Record<string, string> = {}) {
  const items = new Map(Object.entries(initial));
  const operations: string[] = [];
  let queue = Promise.resolve();
  let isLocked = false;
  const slot = (itemKey: string, options?: SecureStoreOptions) => `${options?.keychainService ?? 'app'}/${itemKey}`;
  const run = <Result>(name: string, operation: () => Result): Promise<Result> => {
    const next = queue.then(async () => {
      await Promise.resolve();
      operations.push(name);

      return operation();
    });
    queue = next.then(
      () => undefined,
      () => undefined,
    );

    return next;
  };

  const store: KeychainStore = {
    getItemAsync: (itemKey, options) =>
      run(`get ${slot(itemKey, options)}`, () => {
        if (isLocked && options?.keychainService === undefined) {
          throw new Error('locked');
        }

        return items.get(slot(itemKey, options)) ?? null;
      }),
    setItemAsync: (itemKey, value, options) =>
      run(`set ${slot(itemKey, options)}`, () => {
        items.set(slot(itemKey, options), value);
      }),
    deleteItemAsync: (itemKey, options) =>
      run(`delete ${slot(itemKey, options)}`, () => {
        items.delete(slot(itemKey, options));
      }),
  };

  return {
    store,
    items,
    operations,
    lock: () => {
      isLocked = true;
    },
  };
}

describe('session token cache', () => {
  test('keeps the session readable by a request that overlaps a save', async () => {
    const keychain = serializedKeychain({ [`bankstats.session/${key}`]: 'client-1' });
    const cache = createSessionTokenCache(keychain.store, lockedReadable);

    const [, read] = await Promise.all([cache.saveToken(key, 'client-2'), cache.getToken(key)]);

    expect(read).not.toBeNull();
    expect(await cache.getToken(key)).toBe('client-2');
  });

  test('moves a token saved by an earlier build without a moment where it is missing', async () => {
    const keychain = serializedKeychain({ [`app/${key}`]: 'client-1' });
    const cache = createSessionTokenCache(keychain.store, lockedReadable);

    const [, read] = await Promise.all([cache.saveToken(key, 'client-2'), cache.getToken(key)]);

    expect(read).not.toBeNull();
    expect(keychain.items.get(`bankstats.session/${key}`)).toBe('client-2');
    expect(keychain.items.has(`app/${key}`)).toBe(false);
  });

  test('reads a token saved by an earlier build until it is moved', async () => {
    const keychain = serializedKeychain({ [`app/${key}`]: 'client-1' });
    const cache = createSessionTokenCache(keychain.store, lockedReadable);

    expect(await cache.getToken(key)).toBe('client-1');
  });

  test('reads the moved token while the phone is locked', async () => {
    const keychain = serializedKeychain({ [`app/${key}`]: 'client-1' });
    const cache = createSessionTokenCache(keychain.store, lockedReadable);

    await cache.saveToken(key, 'client-2');
    keychain.lock();

    expect(await cache.getToken(key)).toBe('client-2');
  });

  test('forgets both the moved and the earlier token on sign-out', async () => {
    const keychain = serializedKeychain({ [`app/${key}`]: 'client-1', [`bankstats.session/${key}`]: 'client-2' });
    const cache = createSessionTokenCache(keychain.store, lockedReadable);

    await cache.clearToken(key);

    expect(await cache.getToken(key)).toBeNull();
  });
});
