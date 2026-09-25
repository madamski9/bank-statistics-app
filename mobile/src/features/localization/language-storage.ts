import * as SecureStore from 'expo-secure-store';

import { isLanguage, type Language } from './language';

const languageKey = 'bankstats.language.v1';

export async function readStoredLanguage(): Promise<Language | null> {
  try {
    const stored = await SecureStore.getItemAsync(languageKey);

    return isLanguage(stored) ? stored : null;
  } catch {
    return null;
  }
}

export async function storeLanguage(language: Language): Promise<void> {
  await SecureStore.setItemAsync(languageKey, language);
}
