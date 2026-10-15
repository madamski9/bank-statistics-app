import { describe, expect, test } from 'bun:test';

import { devicePlatformName, lastSeenLabel } from './device-labels';

describe('lastSeenLabel', () => {
  const now = 10 * 86_400_000;

  test('says how long ago a device last synchronized', () => {
    expect(lastSeenLabel(now - 60_000, now)).toBe('aktywne teraz');
    expect(lastSeenLabel(now - 20 * 60_000, now)).toBe('aktywne 20 min temu');
    expect(lastSeenLabel(now - 3 * 3_600_000, now)).toBe('aktywne 3 godz. temu');
    expect(lastSeenLabel(now - 30 * 3_600_000, now)).toBe('aktywne wczoraj');
    expect(lastSeenLabel(now - 4 * 86_400_000, now)).toBe('aktywne 4 dni temu');
  });

  test('names the platform in Polish', () => {
    expect(devicePlatformName('ios')).toBe('iPhone');
    expect(devicePlatformName('web')).toBe('Przeglądarka');
  });
});
