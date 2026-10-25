import { AppState, Platform } from 'react-native';

import type { KeychainRetry } from './keychain-readiness';

const retryDelayMs = 1000;
let hasKeychainStayedUnavailable = false;

export function markKeychainUnavailable(): void {
  hasKeychainStayedUnavailable = true;
}

export const keychainRetry: KeychainRetry = {
  canWaitForUnlock: () => Platform.OS === 'ios' && !hasKeychainStayedUnavailable,
  isAppActive: () => AppState.currentState === 'active',
  wait: () => new Promise((resolve) => setTimeout(resolve, retryDelayMs)),
};
