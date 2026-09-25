import { describe, expect, test } from 'bun:test';

import {
  afterFailedAttempt,
  createStoredPin,
  isValidPin,
  lockoutDurationMs,
  lockoutLabel,
  matchesStoredPin,
  noPinAttempts,
  parsePinAttempts,
  parseStoredPin,
  remainingLockoutMs,
} from './pin';

const reversingDigest = async (value: string) => [...value].reverse().join('');

describe('isValidPin', () => {
  test('accepts exactly four digits', () => {
    expect(isValidPin('0000')).toBe(true);
    expect(isValidPin('1234')).toBe(true);
    expect(isValidPin('123')).toBe(false);
    expect(isValidPin('12345')).toBe(false);
    expect(isValidPin('12a4')).toBe(false);
    expect(isValidPin('１２３４')).toBe(false);
  });
});

describe('stored PIN', () => {
  test('never keeps the PIN itself and matches only the same PIN', async () => {
    const stored = await createStoredPin('4821', 'salt', reversingDigest);

    expect(JSON.stringify(stored)).not.toContain('4821');
    expect(await matchesStoredPin('4821', stored, reversingDigest)).toBe(true);
    expect(await matchesStoredPin('4822', stored, reversingDigest)).toBe(false);
    expect(await matchesStoredPin('48210', stored, reversingDigest)).toBe(false);
  });

  test('salts the digest so the same PIN differs between devices', async () => {
    const first = await createStoredPin('1111', 'one', reversingDigest);
    const second = await createStoredPin('1111', 'two', reversingDigest);

    expect(first.digest).not.toBe(second.digest);
  });

  test('refuses to store a PIN that is not four digits', async () => {
    await expect(createStoredPin('12', 'salt', reversingDigest)).rejects.toThrow();
  });

  test('reads back only a complete stored PIN', () => {
    expect(parseStoredPin(JSON.stringify({ salt: 's', digest: 'd' }))).toEqual({
      salt: 's',
      digest: 'd',
    });
    expect(parseStoredPin(null)).toBeNull();
    expect(parseStoredPin('broken')).toBeNull();
    expect(parseStoredPin(JSON.stringify({ salt: '', digest: 'd' }))).toBeNull();
  });
});

describe('failed attempts', () => {
  test('allows five tries, then waits longer after every further miss', () => {
    expect(lockoutDurationMs(4)).toBe(0);
    expect(lockoutDurationMs(5)).toBe(30_000);
    expect(lockoutDurationMs(6)).toBe(60_000);
    expect(lockoutDurationMs(7)).toBe(120_000);
    expect(lockoutDurationMs(20)).toBe(15 * 60_000);
  });

  test('counts misses and knows how long is left to wait', () => {
    let attempts = noPinAttempts;

    for (let miss = 0; miss < 5; miss += 1) {
      attempts = afterFailedAttempt(attempts, 1_000);
    }

    expect(attempts).toEqual({ failedCount: 5, lockedUntilMs: 31_000 });
    expect(remainingLockoutMs(attempts, 21_000)).toBe(10_000);
    expect(remainingLockoutMs(attempts, 40_000)).toBe(0);
  });

  test('treats a damaged attempt record as no misses', () => {
    expect(parsePinAttempts(null)).toEqual(noPinAttempts);
    expect(parsePinAttempts('{"failedCount":"x"}')).toEqual(noPinAttempts);
    expect(parsePinAttempts(JSON.stringify({ failedCount: 6, lockedUntilMs: 5 }))).toEqual({
      failedCount: 6,
      lockedUntilMs: 5,
    });
  });

  test('describes the wait in seconds, then whole minutes', () => {
    expect(lockoutLabel(29_100)).toBe('30 s');
    expect(lockoutLabel(90_000)).toBe('2 min');
  });
});
