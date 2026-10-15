import { describe, expect, test } from 'bun:test';

import { resolveMerchant } from './merchant-alias';

describe('resolveMerchant', () => {
  test('files every spelling of one chain under its canonical name', () => {
    expect(resolveMerchant('ZABKA NANO Z7423').name).toBe('Żabka');
    expect(resolveMerchant('Żabka').name).toBe('Żabka');
    expect(resolveMerchant('ZABKA').key).toBe(resolveMerchant('Żabka').key);
  });

  test('keeps the label the bank sent', () => {
    expect(resolveMerchant('ZABKA NANO Z7423').label).toBe('ZABKA NANO Z7423');
  });

  test('leaves an unknown shop under its own name', () => {
    expect(resolveMerchant('Latto Gelato')).toEqual({
      key: 'latto gelato',
      name: 'Latto Gelato',
      label: 'Latto Gelato',
      isAlias: false,
    });
  });

  test('keeps two different shops apart', () => {
    expect(resolveMerchant('Lidl').key).not.toBe(resolveMerchant('Aldi').key);
  });
});
