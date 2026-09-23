import { describe, expect, test } from 'bun:test';

import { alertWindow, previousAlertWindow } from './alert-period';

describe('alertWindow', () => {
  test('a month runs from the first of the calendar month', () => {
    const window = alertWindow({ kind: 'month' }, new Date(2026, 8, 22, 17, 44));

    expect(window.key).toBe('month:2026-09');
    expect(new Date(window.startMs).getDate()).toBe(1);
    expect(new Date(window.endMs).getMonth()).toBe(9);
  });

  test('a week runs from Monday, the week Poland reads', () => {
    const window = alertWindow({ kind: 'week' }, new Date(2026, 8, 22, 17, 44));

    expect(new Date(window.startMs).getDay()).toBe(1);
    expect(window.key).toBe('week:2026-09-21');
  });

  test('a year runs from the first of January', () => {
    const window = alertWindow({ kind: 'year' }, new Date(2026, 8, 22));

    expect(new Date(window.startMs).getMonth()).toBe(0);
    expect(window.key).toBe('year:2026');
  });

  test('a one-time interval keeps the dates it was given', () => {
    const startMs = Date.parse('2026-09-01T00:00:00.000Z');
    const endMs = Date.parse('2026-09-15T00:00:00.000Z');
    const window = alertWindow({ kind: 'custom', startMs, endMs }, new Date(2026, 8, 10));

    expect(window).toEqual({ key: `custom:${startMs}-${endMs}`, startMs, endMs });
  });

  test('tells whether the period has already closed', () => {
    const past = alertWindow(
      { kind: 'custom', startMs: 0, endMs: Date.parse('2026-01-01T00:00:00.000Z') },
      new Date(2026, 8, 22),
    );

    expect(past.endMs).toBeLessThan(new Date(2026, 8, 22).getTime());
  });
});

describe('previousAlertWindow', () => {
  test('a month steps back to the month that has just closed', () => {
    const window = previousAlertWindow({ kind: 'month' }, new Date(2026, 8, 22));

    expect(window.key).toBe('month:2026-08');
    expect(window.endMs).toBe(new Date(2026, 8, 1).getTime());
  });

  test('a week steps back to the previous Monday', () => {
    const window = previousAlertWindow({ kind: 'week' }, new Date(2026, 8, 22));

    expect(window.key).toBe('week:2026-09-14');
  });

  test('a year steps back one year', () => {
    expect(previousAlertWindow({ kind: 'year' }, new Date(2026, 8, 22)).key).toBe('year:2025');
  });

  test('a one-time interval has no previous run', () => {
    const period = { kind: 'custom', startMs: 10, endMs: 20 } as const;

    expect(previousAlertWindow(period, new Date(2026, 8, 22))).toEqual(
      alertWindow(period, new Date(2026, 8, 22)),
    );
  });
});
