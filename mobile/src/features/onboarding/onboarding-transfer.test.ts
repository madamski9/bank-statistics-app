import type { SecureStoreOptions } from 'expo-secure-store';
import { describe, expect, test } from 'bun:test';

import { createOnboardingCompletion } from './onboarding-completion';
import { transferOnboardingState } from './onboarding-transfer';
import { banksKey } from './selected-banks-key';
import { shortcutSetupProgressKey } from './shortcut-setup/shortcut-setup-progress';

const readableWhileLocked: SecureStoreOptions = { keychainAccessible: 3 };

function keychain(initial: Record<string, string> = {}) {
  const items = new Map(Object.entries(initial));
  const writes: { key: string; options?: SecureStoreOptions }[] = [];

  return {
    items,
    writes,
    getItemAsync: async (key: string) => items.get(key) ?? null,
    setItemAsync: async (key: string, value: string, options?: SecureStoreOptions) => {
      writes.push({ key, options });
      items.set(key, value);
    },
  };
}

describe('transferring onboarding to a replacement account', () => {
  test('keeps onboarding finished, the chosen banks and the Shortcuts progress', async () => {
    const store = keychain({
      'bankstats.onboarding.v2.user_beta': 'true',
      [banksKey('user_beta')]: '["millennium","pko"]',
      [shortcutSetupProgressKey('user_beta')]: '["millennium","pko"]',
    });

    await transferOnboardingState(store, readableWhileLocked, 'user_beta', 'user_live');

    expect(await createOnboardingCompletion(store, readableWhileLocked).isCompleted('user_live')).toBe(true);
    expect(store.items.get(banksKey('user_live'))).toBe('["millennium","pko"]');
    expect(store.items.get(shortcutSetupProgressKey('user_live'))).toBe('["millennium","pko"]');
  });

  test('keeps the completion flag readable while the phone is locked', async () => {
    const store = keychain({ 'bankstats.onboarding.v2.user_beta': 'true' });

    await transferOnboardingState(store, readableWhileLocked, 'user_beta', 'user_live');

    expect(store.writes).toEqual([{ key: 'bankstats.onboarding.v2.user_live', options: readableWhileLocked }]);
  });

  test('carries a completion that only an older build recorded', async () => {
    const store = keychain({ 'bankstats.onboarding.v1.user_beta': 'true' });

    await transferOnboardingState(store, readableWhileLocked, 'user_beta', 'user_live');

    expect(await createOnboardingCompletion(store, readableWhileLocked).isCompleted('user_live')).toBe(true);
  });

  test('never overwrites what the replacement account already saved', async () => {
    const store = keychain({
      [banksKey('user_beta')]: '["millennium"]',
      [banksKey('user_live')]: '["ing"]',
    });

    await transferOnboardingState(store, readableWhileLocked, 'user_beta', 'user_live');

    expect(store.items.get(banksKey('user_live'))).toBe('["ing"]');
  });

  test('leaves a replacement account without onboarding when the previous one had none', async () => {
    const store = keychain();

    await transferOnboardingState(store, readableWhileLocked, 'user_beta', 'user_live');

    expect(store.writes).toEqual([]);
    expect(await createOnboardingCompletion(store, readableWhileLocked).isCompleted('user_live')).toBe(false);
  });
});
