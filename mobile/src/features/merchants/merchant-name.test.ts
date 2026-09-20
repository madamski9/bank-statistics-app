import { describe, expect, it } from 'bun:test';

import { merchantKey, splitMerchant } from './merchant-name';

describe('splitMerchant', () => {
  it('splits the city and region off a Wallet merchant line', () => {
    expect(splitMerchant('Inmedio Gdańsk, Pomorskie')).toEqual({
      name: 'Inmedio',
      location: 'Gdańsk, Pomorskie',
    });
  });

  it('keeps a shop that carries no location', () => {
    expect(splitMerchant('adidas')).toEqual({ name: 'adidas' });
  });

  it('files both spellings of the same chain under one name', () => {
    const withBranch = splitMerchant('adidas Gdańsk, Pomorskie');

    expect(withBranch.name).toBe('adidas');
    expect(merchantKey(withBranch.name)).toBe(merchantKey(splitMerchant('adidas').name));
  });

  it('leaves a place that belongs to the shop name alone', () => {
    expect(splitMerchant('Murall Gdańsk Gdańsk, Pomorskie')).toEqual({
      name: 'Murall Gdańsk',
      location: 'Gdańsk, Pomorskie',
    });
  });

  it('handles diacritics and multi-word names', () => {
    expect(splitMerchant('Żabka Gdańsk, Pomorskie')).toEqual({
      name: 'Żabka',
      location: 'Gdańsk, Pomorskie',
    });
    expect(splitMerchant('Latto Gelato Gdańsk, Pomorskie')).toEqual({
      name: 'Latto Gelato',
      location: 'Gdańsk, Pomorskie',
    });
  });

  it('collapses the whitespace a raw push may still carry', () => {
    expect(splitMerchant('  Inmedio   Gdańsk,  Pomorskie ')).toEqual({
      name: 'Inmedio',
      location: 'Gdańsk, Pomorskie',
    });
  });

  it('does not treat a lowercase tail as a region', () => {
    expect(splitMerchant('Sklep Test, sp. z o.o.')).toEqual({ name: 'Sklep Test, sp. z o.o.' });
  });
});

describe('merchantKey', () => {
  it('ignores case so one shop stays one shop', () => {
    expect(merchantKey('Żabka')).toBe(merchantKey('ŻABKA'));
    expect(merchantKey('adidas')).toBe(merchantKey('Adidas'));
  });

  it('keeps different shops apart', () => {
    expect(merchantKey('Żabka')).not.toBe(merchantKey('Zabka'));
  });
});
