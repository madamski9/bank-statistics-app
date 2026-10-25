import * as SecureStore from 'expo-secure-store';

import { readWhenUnlocked } from '../keychain/keychain-readiness';
import { keychainRetry } from '../keychain/keychain-retry';
import { isLanguage, type Language } from './language';

const languageKey = 'bankstats.language.v1';

export async function readStoredLanguage(): Promise<Language | null> {
  const stored = await readWhenUnlocked(() => SecureStore.getItemAsync(languageKey), keychainRetry);

  return stored.status === 'read' && isLanguage(stored.value) ? stored.value : null;
}

export async function storeLanguage(language: Language): Promise<void> {
  await SecureStore.setItemAsync(languageKey, language);
}
