import { describe, expect, test } from 'bun:test';

import { maskAmountLabel } from './amount-masking';

describe('maskAmountLabel', () => {
  test('hides every digit while keeping the sign and the currency', () => {
    expect(maskAmountLabel('1 234,56 zł')).toBe('••• zł');
    expect(maskAmountLabel('−34,50 zł')).toBe('−••• zł');
    expect(maskAmountLabel('+12 EUR')).toBe('+••• EUR');
    expect(maskAmountLabel('1,2 mln zł')).toBe('••• mln zł');
  });

  test('hides amounts inside a sentence', () => {
    expect(maskAmountLabel('Zostało 120 zł z 500 zł')).toBe(
      'Zostało ••• zł z ••• zł',
    );
  });
});
