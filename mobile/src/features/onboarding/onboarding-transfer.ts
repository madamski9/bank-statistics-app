import type { SecureStoreOptions } from 'expo-secure-store';

import type { KeychainStore } from '@/features/auth/session/session-token-cache';

import { completionKey, legacyCompletionKey } from './onboarding-completion';
import { banksKey } from './selected-banks-key';
import { shortcutSetupProgressKey } from './shortcut-setup/shortcut-setup-progress';

interface UserScopedItem {
  key: (userId: string) => string;
  options?: SecureStoreOptions;
}

export async function transferOnboardingState(
  store: Pick<KeychainStore, 'getItemAsync' | 'setItemAsync'>,
  readableWhileLocked: SecureStoreOptions,
  previousUserId: string,
  userId: string,
): Promise<void> {
  const items: UserScopedItem[] = [
    { key: completionKey, options: readableWhileLocked },
    { key: legacyCompletionKey },
    { key: banksKey },
    { key: shortcutSetupProgressKey },
  ];

  for (const { key, options } of items) {
    if ((await store.getItemAsync(key(userId), options)) !== null) {
      continue;
    }

    const previous = await store.getItemAsync(key(previousUserId), options);

    if (previous !== null) {
      await store.setItemAsync(key(userId), previous, options);
    }
  }
}
