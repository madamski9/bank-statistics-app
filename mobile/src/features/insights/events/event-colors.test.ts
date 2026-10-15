import { describe, expect, test } from 'bun:test';

import { defaultEventColor, eventColorKey, nextEventColor } from './event-colors';

describe('event colours', () => {
  test('starts with the default colour', () => {
    expect(nextEventColor([])).toBe(defaultEventColor);
  });

  test('moves on from the colour of the latest event', () => {
    expect(
      nextEventColor([
        { color: 'lemon', startedAt: '2026-01-01T00:00:00.000Z' },
        { color: 'amber', startedAt: '2026-05-01T00:00:00.000Z' },
      ]),
    ).toBe('coral');
  });

  test('wraps around after the last colour', () => {
    expect(nextEventColor([{ color: 'copper', startedAt: '2026-05-01T00:00:00.000Z' }])).toBe('amber');
  });

  test('falls back to the default for an unknown colour', () => {
    expect(eventColorKey({ color: 'plaid' })).toBe(defaultEventColor);
  });
});
