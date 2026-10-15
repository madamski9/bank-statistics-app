import { useSyncExternalStore } from 'react';

export const languages = ['pl', 'en'] as const;

export type Language = (typeof languages)[number];

export type Localized<Copy> = { pl: Copy; en: NoInfer<Copy> };

export const languageNames: Record<Language, string> = {
  pl: 'Polski',
  en: 'English',
};

export const languageLocales: Record<Language, string> = {
  pl: 'pl-PL',
  en: 'en-US',
};

let currentLanguage: Language = 'pl';
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function isLanguage(value: unknown): value is Language {
  return languages.some((language) => language === value);
}

export function getCurrentLanguage(): Language {
  return currentLanguage;
}

export function setCurrentLanguage(language: Language): void {
  if (language === currentLanguage) {
    return;
  }

  currentLanguage = language;
  listeners.forEach((listener) => listener());
}

export function useLanguage(): Language {
  return useSyncExternalStore(subscribe, getCurrentLanguage);
}

export function defineCopy<Copy>(copy: Localized<Copy>): Localized<Copy> {
  return copy;
}

export function currentCopy<Copy>(copy: Localized<Copy>, language: Language = currentLanguage): Copy {
  return copy[language];
}

export function useCopy<Copy>(copy: Localized<Copy>): Copy {
  return copy[useLanguage()];
}

export function languageFromLocale(locale: string | undefined): Language {
  return locale?.toLowerCase().startsWith('pl') === true ? 'pl' : 'en';
}

export function deviceLanguage(): Language {
  try {
    return languageFromLocale(Intl.DateTimeFormat().resolvedOptions().locale);
  } catch {
    return 'pl';
  }
}
