import { describe, expect, test } from 'bun:test';

import { alertsToRaise, sentKey } from './alert-delivery';
import type { AlertProgress } from './alert-evaluation';
import type { AlertRule } from './alert-rule';

const window = { key: 'month:2026-09', startMs: 0, endMs: Date.parse('2026-10-01T00:00:00.000Z') };

function rule(overrides: Partial<AlertRule> = {}): AlertRule {
  return {
    id: 'rule-1',
    metric: 'expense',
    scope: { kind: 'merchant', key: 'żabka', name: 'Żabka' },
    period: { kind: 'month' },
    condition: 'threshold',
    targetMinor: 50_000,
    thresholdShares: [0.8, 1],
    isActive: true,
    createdAt: '2026-09-01T00:00:00.000Z',
    ...overrides,
  };
}

function progress(amountMinor: number, targetMinor = 50_000): AlertProgress {
  return {
    amountMinor,
    targetMinor,
    share: targetMinor === 0 ? 0 : amountMinor / targetMinor,
    window,
    currency: 'PLN',
  };
}

const closedAt = new Date(2026, 9, 1, 0, 0);
const duringPeriod = new Date(2026, 8, 22, 17, 44);

describe('alertsToRaise', () => {
  test('stays quiet below the first threshold', () => {
    expect(alertsToRaise(rule(), progress(39_000), [], duringPeriod)).toEqual([]);
  });

  test('raises the approach alert once spending reaches 80 percent', () => {
    const raised = alertsToRaise(rule(), progress(40_000), [], duringPeriod);

    expect(raised).toHaveLength(1);
    expect(raised[0].share).toBe(0.8);
    expect(raised[0].key).toBe(sentKey(rule(), window.key, 0.8));
  });

  test('never repeats an alert it has already sent this period', () => {
    const sent = [sentKey(rule(), window.key, 0.8)];

    expect(alertsToRaise(rule(), progress(45_000), sent, duringPeriod)).toEqual([]);
  });

  test('a changed shop starts a fresh threshold for the edited rule', () => {
    const sent = [sentKey(rule(), window.key, 0.8)];
    const edited = rule({ scope: { kind: 'merchant', key: 'lidl', name: 'Lidl' } });

    expect(alertsToRaise(edited, progress(45_000), sent, duringPeriod)).toHaveLength(1);
  });

  test('raises the limit itself as its own alert', () => {
    const sent = [sentKey(rule(), window.key, 0.8)];
    const raised = alertsToRaise(rule(), progress(51_000), sent, duringPeriod);

    expect(raised).toHaveLength(1);
    expect(raised[0].share).toBe(1);
  });

  test('raises the highest reached threshold when one purchase jumps past the limit', () => {
    expect(alertsToRaise(rule(), progress(60_000), [], duringPeriod).map((alert) => alert.share)).toEqual([1]);
  });

  test('starts over in the next period', () => {
    const october = { ...window, key: 'month:2026-10' };
    const sent = [sentKey(rule(), window.key, 0.8), sentKey(rule(), window.key, 1)];
    const raised = alertsToRaise(
      rule(),
      { ...progress(60_000), window: october },
      sent,
      duringPeriod,
    );

    expect(raised).toHaveLength(1);
  });

  test('says nothing for a rule the user switched off', () => {
    expect(alertsToRaise(rule({ isActive: false }), progress(60_000), [], duringPeriod)).toEqual([]);
  });

  test('reports expected income that never arrived, but only once the period has closed', () => {
    const missing = rule({
      metric: 'income',
      scope: { kind: 'all' },
      condition: 'missingIncome',
      thresholdShares: [1],
    });

    expect(alertsToRaise(missing, progress(0), [], duringPeriod)).toEqual([]);
    expect(alertsToRaise(missing, progress(0), [], closedAt)).toHaveLength(1);
    expect(alertsToRaise(missing, progress(50_000), [], closedAt)).toEqual([]);
  });
});
