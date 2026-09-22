import { describe, expect, test } from 'bun:test';

import { alertMessage, scopeLabel } from './alert-message';
import type { AlertRule } from './alert-rule';

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

function raised(share: number, amountMinor: number) {
  return {
    key: `rule-1|month:2026-09|${share}`,
    ruleId: 'rule-1',
    share,
    amountMinor,
    targetMinor: 50_000,
    currency: 'PLN',
    periodKey: 'month:2026-09',
  };
}

describe('alertMessage', () => {
  test('says how close the month is to the limit, and what is left', () => {
    const message = alertMessage(rule(), raised(0.8, 40_000));

    expect(message.title).toBe('Blisko limitu w Żabka');
    expect(message.body).toBe('Wydatki w tym miesiącu: 400,00\u00a0zł z 500,00\u00a0zł. Zostało 100,00\u00a0zł.');
  });

  test('states plainly that the limit is reached, without a verdict on it', () => {
    const message = alertMessage(rule(), raised(1, 51_000));

    expect(message.title).toBe('Limit w Żabka osiągnięty');
    expect(message.body).toBe('Wydatki w tym miesiącu: 510,00 zł przy limicie 500,00 zł.');
  });

  test('reports expected income that has not arrived', () => {
    const missing = rule({
      metric: 'income',
      scope: { kind: 'all' },
      condition: 'missingIncome',
      thresholdShares: [1],
    });
    const message = alertMessage(missing, raised(1, 0));

    expect(message.title).toBe('Brak spodziewanego wpływu');
    expect(message.body).toBe('Wpływy w tym miesiącu: 0,00 zł z oczekiwanych 500,00 zł.');
  });

  test('titles a rule that watches everything without naming a shop', () => {
    const everything = rule({ scope: { kind: 'all' } });

    expect(alertMessage(everything, raised(0.8, 40_000)).title).toBe('Blisko limitu wydatków');
    expect(alertMessage(everything, raised(1, 50_000)).title).toBe('Limit wydatków osiągnięty');
  });

  test('names each scope the way the user set it', () => {
    expect(scopeLabel({ kind: 'all' })).toBe('wszystkie wydatki');
    expect(scopeLabel({ kind: 'merchant', key: 'lidl', name: 'Lidl' })).toBe('Lidl');
    expect(scopeLabel({ kind: 'counterparty', name: 'Jan Kowalski' })).toBe('Jan Kowalski');
    expect(scopeLabel({ kind: 'category', id: 'groceries' })).toBe('Zakupy spożywcze');
  });
});

describe('wording follows the metric the rule watches', () => {
  test('an income goal is not announced as a spending limit', () => {
    const goal = rule({ metric: 'income', scope: { kind: 'all' } });

    expect(alertMessage(goal, raised(0.8, 40_000)).title).toBe('Blisko celu przychodów');
    expect(alertMessage(goal, raised(1, 50_000)).title).toBe('Cel przychodów osiągnięty');
    expect(alertMessage(goal, raised(1, 50_000)).body).toBe(
      'Przychody w tym miesiącu: 500,00 zł przy progu 500,00 zł.',
    );
  });

  test('a net flow rule talks about the balance', () => {
    const balance = rule({ metric: 'netFlow', scope: { kind: 'all' } });

    expect(alertMessage(balance, raised(1, 50_000)).title).toBe('Próg bilansu osiągnięty');
    expect(alertMessage(balance, raised(1, 50_000)).body).toBe(
      'Bilans w tym miesiącu: 500,00 zł przy progu 500,00 zł.',
    );
  });
});
