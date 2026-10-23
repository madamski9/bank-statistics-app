import { describe, expect, test } from 'bun:test';

import { advertisedTrialDays, storeOfferingFor, trialDays } from './trial-offer';

describe('trial offer', () => {
  test('withholds the trial until BankStats has captured 15 real transactions', () => {
    expect(storeOfferingFor({ capturedTransactionCount: 14, reason: null })).toBe('standard');
    expect(storeOfferingFor({ capturedTransactionCount: 15, reason: null })).toBe('trial');
  });

  test('offers the trial when the user chooses a Premium feature', () => {
    expect(storeOfferingFor({ capturedTransactionCount: 0, reason: 'report' })).toBe('trial');
  });

  test('counts the length of a store trial in days', () => {
    expect(trialDays('DAY', 14)).toBe(14);
    expect(trialDays('WEEK', 2)).toBe(14);
    expect(trialDays('FORTNIGHT', 1)).toBeNull();
    expect(trialDays('DAY', 0)).toBeNull();
  });

  test('promises an iOS trial only to customers the App Store still considers eligible', () => {
    expect(advertisedTrialDays(14, 'ios', 'eligible')).toBe(14);
    expect(advertisedTrialDays(14, 'ios', 'ineligible')).toBeNull();
    expect(advertisedTrialDays(14, 'ios', 'unknown')).toBeNull();
  });

  test('keeps the Google Play trial, which the store offers only to eligible customers', () => {
    expect(advertisedTrialDays(14, 'android', 'unknown')).toBe(14);
    expect(advertisedTrialDays(null, 'android', 'unknown')).toBeNull();
  });
});
