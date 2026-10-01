import { describe, expect, test } from 'bun:test';

import { nextReminderDate } from './reminder-schedule';

describe('monthly summary reminder', () => {
  test('keeps the reminder on the first of the month before it fires', () => {
    expect(nextReminderDate(new Date(2026, 9, 1, 8, 0))).toEqual(new Date(2026, 9, 1, 9, 0));
  });

  test('moves to the next month once the reminder time has passed', () => {
    expect(nextReminderDate(new Date(2026, 9, 1, 9, 0))).toEqual(new Date(2026, 10, 1, 9, 0));
    expect(nextReminderDate(new Date(2026, 9, 15, 7, 0))).toEqual(new Date(2026, 10, 1, 9, 0));
    expect(nextReminderDate(new Date(2026, 11, 20, 12, 0))).toEqual(new Date(2027, 0, 1, 9, 0));
  });
});
