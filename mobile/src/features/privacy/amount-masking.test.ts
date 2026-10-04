import { describe, expect, test } from 'bun:test';

import { containsMaskedAmount, maskAmountLabel, revealMaskedAmount } from './amount-masking';

describe('maskAmountLabel', () => {
  test('leaves no readable digit while keeping the sign and the currency', () => {
    const masked = maskAmountLabel('−1 234,56 zł');

    expect(masked).not.toMatch(/[0-9]/);
    expect(masked.startsWith('−')).toBe(true);
    expect(masked.endsWith(' zł')).toBe(true);
  });

  test('masks amounts inside a sentence without touching the words', () => {
    const masked = maskAmountLabel('Zostało 120 zł z 500 zł');

    expect(masked).not.toMatch(/[0-9]/);
    expect(masked.replace(/[-]/g, '')).toBe('Zostało  zł z  zł');
  });
});

describe('containsMaskedAmount', () => {
  test('spots a masked amount anywhere in a label', () => {
    expect(containsMaskedAmount(maskAmountLabel('Łącznie 1 221,53 zł'))).toBe(true);
    expect(containsMaskedAmount('Łącznie 1 221,53 zł')).toBe(false);
  });
});

describe('revealMaskedAmount', () => {
  test('restores the exact amount so it can be drawn under a blur', () => {
    expect(revealMaskedAmount(maskAmountLabel('+1 221,53 zł'))).toBe('+1 221,53 zł');
  });
});
