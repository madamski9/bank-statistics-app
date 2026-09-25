import { setCurrentLanguage, type Language } from './language';
import { storeLanguage } from './language-storage';

export async function changeLanguage(language: Language): Promise<void> {
  await storeLanguage(language).catch(() => undefined);
  setCurrentLanguage(language);
}
