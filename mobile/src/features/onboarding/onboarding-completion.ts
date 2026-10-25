import type { SecureStoreOptions } from 'expo-secure-store';

import type { KeychainRead } from '@/features/app-shell/keychain/keychain-readiness';
import type { KeychainStore } from '@/features/auth/session/session-token-cache';

function completionKey(userId: string): string {
  return `bankstats.onboarding.v2.${userId}`;
}

function legacyCompletionKey(userId: string): string {
  return `bankstats.onboarding.v1.${userId}`;
}

export function createOnboardingCompletion(
  store: Pick<KeychainStore, 'getItemAsync' | 'setItemAsync'>,
  readableWhileLocked: SecureStoreOptions,
) {
  return {
    async isCompleted(userId: string): Promise<boolean> {
      if ((await store.getItemAsync(completionKey(userId), readableWhileLocked)) === 'true') {
        return true;
      }

      if ((await store.getItemAsync(legacyCompletionKey(userId))) !== 'true') {
        return false;
      }

      await store.setItemAsync(completionKey(userId), 'true', readableWhileLocked).catch(() => undefined);

      return true;
    },
    async complete(userId: string): Promise<void> {
      await store.setItemAsync(completionKey(userId), 'true', readableWhileLocked);
      await store.setItemAsync(legacyCompletionKey(userId), 'true').catch(() => undefined);
    },
  };
}

export function completedAfterRead(read: KeychainRead<boolean>, keychainLocksWithPhone: boolean): boolean {
  return read.status === 'read' ? read.value : keychainLocksWithPhone;
}
