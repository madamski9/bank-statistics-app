import { AppState } from 'react-native';

import type { KeychainRetry } from './keychain-readiness';

const retryDelayMs = 1000;

export const keychainRetry: KeychainRetry = {
  isAppActive: () => AppState.currentState === 'active',
  wait: () => new Promise((resolve) => setTimeout(resolve, retryDelayMs)),
};
