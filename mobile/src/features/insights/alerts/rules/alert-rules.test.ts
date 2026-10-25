import { describe, expect, test } from 'bun:test';

import { activeRules, removeRule, upsertAlertRule } from './alert-rules';
import type { AlertRule } from './alert-rule';

function rule(id: string, overrides: Partial<AlertRule> = {}): AlertRule {
  return {
    id,
    metric: 'expense',
    scope: { kind: 'merchant', key: id, name: id },
    period: { kind: 'month' },
    condition: 'threshold',
    targetMinor: 50_000,
    thresholdShares: [0.8, 1],
    isActive: true,
    createdAt: '2026-09-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('upsertAlertRule', () => {
  test('a free account keeps exactly one rule active and stores the rest', () => {
    const stored = upsertAlertRule([rule('lidl')], rule('żabka'), { isPremium: false });

    expect(stored).toHaveLength(2);
    expect(activeRules(stored).map((entry) => entry.id)).toEqual(['żabka']);
    expect(stored.find((entry) => entry.id === 'lidl')?.isActive).toBe(false);
  });

  test('a premium account may watch several things at once', () => {
    const stored = upsertAlertRule([rule('lidl')], rule('żabka'), { isPremium: true });

    expect(activeRules(stored)).toHaveLength(2);
  });

  test('editing a rule replaces it rather than adding a second one', () => {
    const stored = upsertAlertRule([rule('żabka')], rule('żabka', { targetMinor: 30_000 }), {
      isPremium: false,
    });

    expect(stored).toHaveLength(1);
    expect(stored[0].targetMinor).toBe(30_000);
  });

  test('saving a limit never removes a limit for another rule', () => {
    const groceries = { kind: 'category', id: 'groceries' } as const;
    const stored = upsertAlertRule(
      [rule('income', { metric: 'income', scope: groceries })],
      rule('expense', { scope: groceries }),
      { isPremium: true },
    );

    expect(stored.map((entry) => entry.id)).toEqual(['income', 'expense']);
  });

  test('limits for different categories live side by side', () => {
    const stored = upsertAlertRule(
      [rule('groceries', { scope: { kind: 'category', id: 'groceries' } })],
      rule('transport', { scope: { kind: 'category', id: 'transport' } }),
      { isPremium: true },
    );

    expect(stored).toHaveLength(2);
  });

  test('switching a rule off leaves the others alone', () => {
    const stored = upsertAlertRule(
      [rule('lidl'), rule('żabka', { isActive: false })],
      rule('lidl', { isActive: false }),
      { isPremium: false },
    );

    expect(activeRules(stored)).toHaveLength(0);
    expect(stored).toHaveLength(2);
  });
});

describe('removeRule', () => {
  test('forgets the rule and keeps the rest', () => {
    expect(removeRule([rule('lidl'), rule('żabka')], 'lidl').map((entry) => entry.id)).toEqual([
      'żabka',
    ]);
  });
});
