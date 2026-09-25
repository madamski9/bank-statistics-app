import { afterEach, describe, expect, test } from 'bun:test';

import { setCurrentLanguage } from '@/features/localization/language';

import {
  formatAmount,
  formatCompactAmount,
  formatSignedAmount,
  formatTransactionCount,
} from './formatting';

afterEach(() => setCurrentLanguage('pl'));

describe('formatting', () => {
  test('groups Polish amounts with non-breaking spaces and a decimal comma', () => {
    expect(formatAmount(123_456, 'PLN')).toBe('1 234,56 zł');
    expect(formatTransactionCount(5)).toBe('5 transakcji');
  });

  test('groups English amounts with commas and a decimal point', () => {
    setCurrentLanguage('en');

    expect(formatAmount(123_456, 'PLN')).toBe('1,234.56 zł');
    expect(formatSignedAmount(-3_450, 'EUR')).toBe('−34.50 EUR');
    expect(formatCompactAmount(250_000_000, 'PLN')).toBe('2.5 M zł');
    expect(formatTransactionCount(1)).toBe('1 transaction');
    expect(formatTransactionCount(3)).toBe('3 transactions');
  });
});
