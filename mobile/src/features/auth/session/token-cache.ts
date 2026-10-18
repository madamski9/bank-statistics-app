import * as SecureStore from 'expo-secure-store';

import { createSessionTokenCache } from './session-token-cache';

export const tokenCache = createSessionTokenCache(SecureStore, {
  keychainService: 'bankstats.session',
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
});
