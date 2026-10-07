import { describe, expect, test } from 'bun:test';

import {
  defaultPrivacySettings,
  parsePrivacySettings,
  shouldLockOnReturn,
  type PrivacySettings,
} from './privacy-settings';

const locked: PrivacySettings = { ...defaultPrivacySettings, isLockEnabled: true };

describe('parsePrivacySettings', () => {
  test('starts unlocked, with amounts visible and the widget blurred', () => {
    expect(parsePrivacySettings(null)).toEqual({
      isLockEnabled: false,
      lockTimeout: 'immediate',
      isPrivacyModeEnabled: false,
      isWidgetBlurred: true,
    });
  });

  test('reads back what was stored', () => {
    const stored: PrivacySettings = {
      isLockEnabled: true,
      lockTimeout: 'fiveMinutes',
      isPrivacyModeEnabled: true,
      isWidgetBlurred: true,
    };

    expect(parsePrivacySettings(JSON.stringify(stored))).toEqual(stored);
  });

  test('falls back per field instead of trusting a damaged payload', () => {
    expect(parsePrivacySettings('not json')).toEqual(defaultPrivacySettings);
    expect(parsePrivacySettings('[]')).toEqual(defaultPrivacySettings);
    expect(
      parsePrivacySettings(JSON.stringify({ isLockEnabled: true, lockTimeout: 'forever' })),
    ).toEqual({ ...defaultPrivacySettings, isLockEnabled: true });
  });
});

describe('shouldLockOnReturn', () => {
  test('never locks while the lock is off or the app never left', () => {
    expect(shouldLockOnReturn(defaultPrivacySettings, 0, 1_000_000)).toBe(false);
    expect(shouldLockOnReturn(locked, null, 1_000_000)).toBe(false);
  });

  test('locks immediately on return when the timeout is immediate', () => {
    expect(shouldLockOnReturn(locked, 10_000, 10_000)).toBe(true);
  });

  test('waits out a one- or five-minute timeout', () => {
    const oneMinute: PrivacySettings = { ...locked, lockTimeout: 'oneMinute' };
    const fiveMinutes: PrivacySettings = { ...locked, lockTimeout: 'fiveMinutes' };

    expect(shouldLockOnReturn(oneMinute, 0, 59_999)).toBe(false);
    expect(shouldLockOnReturn(oneMinute, 0, 60_000)).toBe(true);
    expect(shouldLockOnReturn(fiveMinutes, 0, 299_999)).toBe(false);
    expect(shouldLockOnReturn(fiveMinutes, 0, 300_000)).toBe(true);
  });
});
