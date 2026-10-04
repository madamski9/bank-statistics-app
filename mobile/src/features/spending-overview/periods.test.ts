import { describe, expect, test } from 'bun:test';

import { periodWindow, previousPeriodWindow } from './periods';

describe('current month period', () => {
  const reference = new Date(2026, 9, 4, 15, 30);

  test('starts on the first day of the month and ends now', () => {
    expect(periodWindow('currentMonth', reference)).toEqual({
      startMs: new Date(2026, 9, 1).getTime(),
      endMs: reference.getTime(),
    });
  });

  test('compares against the same stretch of the previous month', () => {
    expect(previousPeriodWindow('currentMonth', reference)).toEqual({
      startMs: new Date(2026, 8, 1).getTime(),
      endMs: new Date(2026, 8, 4, 15, 30).getTime(),
    });
  });

  test('keeps the local cutoff time across daylight saving changes', () => {
    const springReference = new Date(2026, 3, 4, 15, 30);

    expect(previousPeriodWindow('currentMonth', springReference)?.endMs).toBe(
      new Date(2026, 2, 4, 15, 30).getTime(),
    );
  });

  test('stops the comparison at the end of a shorter previous month', () => {
    const lastDay = new Date(2026, 2, 31, 12);

    expect(previousPeriodWindow('currentMonth', lastDay)?.endMs).toBe(new Date(2026, 2, 1).getTime());
  });
});
