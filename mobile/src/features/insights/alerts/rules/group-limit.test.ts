import { describe, expect, test } from 'bun:test';

import type { AlertRule, AlertScope } from './alert-rule';
import { conflictingRule, isSameScope, ruleForScope } from './group-limit';

function rule(id: string, scope: AlertScope, overrides: Partial<AlertRule> = {}): AlertRule {
  return {
    id,
    metric: 'expense',
    scope,
    period: { kind: 'month' },
    condition: 'threshold',
    targetMinor: 50_000,
    thresholdShares: [1],
    isActive: true,
    createdAt: '2026-09-01T00:00:00.000Z',
    ...overrides,
  };
}

const groceries: AlertScope = { kind: 'category', id: 'groceries' };
const lidl: AlertScope = { kind: 'merchant', key: 'lidl', name: 'Lidl' };

describe('isSameScope', () => {
  test('compares each scope by what identifies it', () => {
    expect(isSameScope(groceries, { kind: 'category', id: 'groceries' })).toBe(true);
    expect(isSameScope(groceries, { kind: 'category', id: 'transport' })).toBe(false);
    expect(isSameScope(lidl, { kind: 'merchant', key: 'lidl', name: 'LIDL' })).toBe(true);
    expect(isSameScope(lidl, groceries)).toBe(false);
    expect(isSameScope({ kind: 'all' }, { kind: 'all' })).toBe(true);
  });
});

describe('ruleForScope', () => {
  test('finds the limit set for a category', () => {
    expect(ruleForScope([rule('lidl', lidl), rule('groceries', groceries)], groceries)?.id).toBe('groceries');
  });
});

describe('conflictingRule', () => {
  const rules = [rule('groceries', groceries, { metric: 'income' }), rule('lidl', lidl), rule('total', { kind: 'all' })];

  test('finds another limit for the chosen category or shop whatever it measures', () => {
    expect(conflictingRule(rules, groceries, null)?.id).toBe('groceries');
    expect(conflictingRule(rules, lidl, 'total')?.id).toBe('lidl');
  });

  test('does not treat the edited limit as its own conflict', () => {
    expect(conflictingRule(rules, groceries, 'groceries')).toBeNull();
  });

  test('lets all spending hold several limits with different metrics', () => {
    expect(conflictingRule(rules, { kind: 'all' }, null)).toBeNull();
  });
});
