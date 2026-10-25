import type { SecureStoreOptions } from 'expo-secure-store';
import { describe, expect, test } from 'bun:test';

import { completedAfterRead, createOnboardingCompletion } from './onboarding-completion';

const readableWhileLocked: SecureStoreOptions = { keychainAccessible: 3 };

interface Item {
  value: string;
  isReadableWhileLocked: boolean;
}

function phoneKeychain(initial: Record<string, Item> = {}) {
  const items = new Map(Object.entries(initial));
  const phone = { isLocked: false, items };

  const store = {
    getItemAsync: async (key: string) => {
      const item = items.get(key);

      if (item === undefined) {
        return null;
      }

      if (phone.isLocked && !item.isReadableWhileLocked) {
        throw new Error('User interaction is not allowed.');
      }

      return item.value;
    },
    setItemAsync: async (key: string, value: string, options?: SecureStoreOptions) => {
      const isReadableWhileLocked = options === readableWhileLocked;

      if (phone.isLocked && !isReadableWhileLocked) {
        throw new Error('User interaction is not allowed.');
      }

      items.set(key, { value, isReadableWhileLocked });
    },
  };

  return { phone, store };
}

describe('onboarding completion', () => {
  test('a new account has not completed onboarding', async () => {
    const { store } = phoneKeychain();

    expect(await createOnboardingCompletion(store, readableWhileLocked).isCompleted('user_1')).toBe(false);
  });

  test('completing onboarding is remembered in a form the app can read while the phone is locked', async () => {
    const { phone, store } = phoneKeychain();
    const completion = createOnboardingCompletion(store, readableWhileLocked);

    await completion.complete('user_1');
    phone.isLocked = true;

    expect(await completion.isCompleted('user_1')).toBe(true);
  });

  test('moves an onboarding completed before this change to the locked-readable form', async () => {
    const { phone, store } = phoneKeychain({
      'bankstats.onboarding.v1.user_1': { value: 'true', isReadableWhileLocked: false },
    });
    const completion = createOnboardingCompletion(store, readableWhileLocked);

    expect(await completion.isCompleted('user_1')).toBe(true);
    phone.isLocked = true;
    expect(await completion.isCompleted('user_1')).toBe(true);
  });

  test('reports a locked keychain as an error instead of an unfinished onboarding', async () => {
    const { phone, store } = phoneKeychain({
      'bankstats.onboarding.v1.user_1': { value: 'true', isReadableWhileLocked: false },
    });
    phone.isLocked = true;

    await expect(createOnboardingCompletion(store, readableWhileLocked).isCompleted('user_1')).rejects.toThrow();
  });

  test('keeps each account separate', async () => {
    const { store } = phoneKeychain();
    const completion = createOnboardingCompletion(store, readableWhileLocked);

    await completion.complete('user_1');

    expect(await completion.isCompleted('user_2')).toBe(false);
  });

  test('a completed onboarding survives a failed write of the legacy flag', async () => {
    const { phone, store } = phoneKeychain();
    const completion = createOnboardingCompletion(store, readableWhileLocked);

    phone.isLocked = true;
    await completion.complete('user_1');

    expect(await completion.isCompleted('user_1')).toBe(true);
  });
});

describe('completedAfterRead', () => {
  test('follows the stored flag when it could be read', () => {
    expect(completedAfterRead({ status: 'read', value: true }, true)).toBe(true);
    expect(completedAfterRead({ status: 'read', value: false }, true)).toBe(false);
  });

  test('opens the app on an iPhone whose keychain stays locked', () => {
    expect(completedAfterRead({ status: 'unavailable' }, true)).toBe(true);
  });

  test('keeps onboarding where an unreadable keychain cannot be a locked phone', () => {
    expect(completedAfterRead({ status: 'unavailable' }, false)).toBe(false);
  });
});
