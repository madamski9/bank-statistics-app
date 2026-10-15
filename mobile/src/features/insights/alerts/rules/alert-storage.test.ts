import { describe, expect, test } from 'bun:test';

import type { AlertRule } from './alert-rule';
import { parseAlertRules, parseSentAlerts } from './alert-storage';

const rule: AlertRule = {
  id: 'rule-1',
  metric: 'expense',
  scope: { kind: 'merchant', key: 'żabka', name: 'Żabka' },
  period: { kind: 'month' },
  condition: 'threshold',
  targetMinor: 50_000,
  thresholdShares: [0.8, 1],
  isActive: true,
  createdAt: '2026-09-01T00:00:00.000Z',
};

describe('parseAlertRules', () => {
  test('reads back what was stored', () => {
    expect(parseAlertRules(JSON.stringify([rule]))).toEqual([rule]);
  });

  test('refuses a damaged or foreign payload instead of crashing the screen', () => {
    expect(parseAlertRules(null)).toEqual([]);
    expect(parseAlertRules('not json')).toEqual([]);
    expect(parseAlertRules('{"rules":1}')).toEqual([]);
    expect(parseAlertRules('[{"id":"rule-1"}]')).toEqual([]);
    expect(parseAlertRules(JSON.stringify([{ ...rule, targetMinor: 'dużo' }]))).toEqual([]);
  });
});

describe('parseSentAlerts', () => {
  test('keeps the ledger of what has already been said', () => {
    expect(parseSentAlerts(JSON.stringify(['rule-1|month:2026-09|0.8']))).toEqual([
      'rule-1|month:2026-09|0.8',
    ]);
    expect(parseSentAlerts('[1, 2]')).toEqual([]);
    expect(parseSentAlerts(null)).toEqual([]);
  });
});
