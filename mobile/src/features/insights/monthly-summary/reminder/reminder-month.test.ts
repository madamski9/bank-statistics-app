import { describe, expect, test } from 'bun:test';

import { monthForReminder } from './reminder-month';

describe('monthly summary reminder', () => {
  test('opens the month before a notification delivered on the first', () => {
    const deliveredMs = new Date('2026-10-01T07:00:00Z').getTime();

    expect(monthForReminder(deliveredMs)).toBe('2026-09');
    expect(monthForReminder(deliveredMs / 1000)).toBe('2026-09');
  });

  test('keeps the intended month when the notification fires in a far eastern timezone', () => {
    const deliveredMs = new Date('2026-09-30T19:00:00Z').getTime();

    expect(monthForReminder(deliveredMs)).toBe('2026-09');
    expect(monthForReminder(Number.NaN)).toBeNull();
  });
});
