import { describe, expect, test } from 'bun:test';

import { currentCopy, defineCopy, languageFromLocale, setCurrentLanguage } from './language';
import { englishPlural, polishPlural } from './plural';

describe('language', () => {
  test('picks Polish only for Polish locales', () => {
    expect(languageFromLocale('pl-PL')).toBe('pl');
    expect(languageFromLocale('en-GB')).toBe('en');
    expect(languageFromLocale('de-DE')).toBe('en');
    expect(languageFromLocale(undefined)).toBe('en');
  });

  test('reads copy in the current language', () => {
    const copy = defineCopy({ pl: { hello: 'Cześć' }, en: { hello: 'Hello' } });

    setCurrentLanguage('en');
    expect(currentCopy(copy).hello).toBe('Hello');
    setCurrentLanguage('pl');
    expect(currentCopy(copy).hello).toBe('Cześć');
  });

  test('declines Polish and English counts', () => {
    expect([1, 2, 5, 12, 22, 25].map((count) => polishPlural(count, 'sklep', 'sklepy', 'sklepów'))).toEqual([
      'sklep',
      'sklepy',
      'sklepów',
      'sklepów',
      'sklepy',
      'sklepów',
    ]);
    expect([1, 2].map((count) => englishPlural(count, 'shop', 'shops'))).toEqual(['shop', 'shops']);
  });
});
