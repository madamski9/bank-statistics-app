import { describe, expect, test } from 'bun:test';

import { canCreateLimit, isPeriodAvailable, lockedPeriods } from './premium-access';

describe('premium access', () => {
  test('leaves the week, month and three months free and locks the year and all time', () => {
    expect(isPeriodAvailable('week', false)).toBe(true);
    expect(isPeriodAvailable('month', false)).toBe(true);
    expect(isPeriodAvailable('quarter', false)).toBe(true);
    expect(isPeriodAvailable('year', false)).toBe(false);
    expect(isPeriodAvailable('all', false)).toBe(false);
    expect([...lockedPeriods(false)]).toEqual(['year', 'all']);
  });

  test('opens every period with premium', () => {
    expect(lockedPeriods(true).size).toBe(0);
    expect(isPeriodAvailable('all', true)).toBe(true);
  });

  test('allows one limit without premium and any number with it', () => {
    expect(canCreateLimit(0, false)).toBe(true);
    expect(canCreateLimit(1, false)).toBe(false);
    expect(canCreateLimit(5, true)).toBe(true);
  });
});
