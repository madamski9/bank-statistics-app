import type { IngestionRecord } from '@bankstats/ingestion-native';
import { describe, expect, test } from 'bun:test';

import { formatAmount } from '@/features/app-shell/formatting/formatting';
import { setCurrentLanguage } from '@/features/app-shell/localization/language';

import type { AlertRule } from '../rules/alert-rule';
import { paymentAlertMessage } from './payment-alert';

setCurrentLanguage('pl');

const reference = new Date(2026, 8, 22, 17, 44);

function payment(id: string, amountMinor: number, merchant = 'Rossmann'): IngestionRecord {
  return {
    id,
    bank: 'millennium',
    direction: 'expense',
    transactionType: 'cardPayment',
    amountMinor,
    currency: 'PLN',
    merchant,
    occurredAt: new Date(2026, 8, 20, 10, 0).toISOString(),
    capturedAt: new Date(2026, 8, 20, 10, 0).toISOString(),
    sourceApp: 'pl.millenniumbank.bankmillennium',
    status: 'posted',
    origin: 'capture',
  };
}

function budget(overrides: Partial<AlertRule> = {}): AlertRule {
  return {
    id: 'budget',
    metric: 'expense',
    scope: { kind: 'all' },
    period: { kind: 'month' },
    condition: 'threshold',
    targetMinor: 10_000,
    thresholdShares: [0.5, 0.8, 0.9, 1],
    isActive: true,
    createdAt: '2026-09-01T00:00:00.000Z',
    tone: 'passive',
    ...overrides,
  };
}

function alertFor(rule: AlertRule, earlier: IngestionRecord[], latest: IngestionRecord) {
  return paymentAlertMessage(rule, latest, [...earlier, latest], { reference, rules: [], hasAggressiveTone: true });
}

describe('all-spending and category limits', () => {
  test('stay quiet while a payment does not pass a threshold', () => {
    expect(alertFor(budget(), [payment('a', 1_000)], payment('b', 1_000))).toBeNull();
    expect(alertFor(budget(), [payment('c', 5_500)], payment('d', 1_000))).toBeNull();
  });

  test('speak up once a payment passes 50%, 80%, 90% and the full limit', () => {
    const titles = [
      alertFor(budget(), [payment('e', 4_000)], payment('f', 2_000)),
      alertFor(budget(), [payment('g', 7_000)], payment('h', 1_500)),
      alertFor(budget(), [payment('i', 8_500)], payment('j', 1_000)),
      alertFor(budget(), [payment('k', 9_500)], payment('l', 1_000)),
    ].map((message) => message?.title);

    expect(titles).toEqual(['Połowa limitu za Tobą', '80% limitu za Tobą', '90% limitu za Tobą', 'Limit przekroczony']);
  });

  test('names the shop and how far past the limit the spending went', () => {
    expect(alertFor(budget(), [payment('s', 9_000)], payment('t', 3_000, 'Żabka'))?.body).toBe(
      `Czas zacisnąć pasa. Żabka: ${formatAmount(2_000, 'PLN')} ponad limit na wszystkie wydatki.`,
    );
  });

  test('a single large payment reports only the highest threshold it passed', () => {
    expect(alertFor(budget(), [], payment('m', 12_000))?.title).toBe('Limit przekroczony');
  });

  test('a category limit names the category', () => {
    const health = budget({ scope: { kind: 'category', id: 'health' } });

    expect(alertFor(health, [], payment('n', 6_000))?.body).toBe(
      `Warto trochę zwolnić. Rossmann: do limitu w kategorii Zdrowie i apteka zostało ${formatAmount(4_000, 'PLN')}.`,
    );
  });

  test('an eating-out limit talks about food', () => {
    const eatingOut = budget({ scope: { kind: 'category', id: 'eatingOut' } });

    expect(alertFor(eatingOut, [], payment('o', 6_000, 'KFC'))?.title).toBe('Połowa limitu na jedzenie');
  });

  test('a groceries limit uses the ordinary wording', () => {
    const groceries = budget({ scope: { kind: 'category', id: 'groceries' } });

    expect(alertFor(groceries, [], payment('o2', 6_000, 'Żabka'))?.body).toContain(
      'Żabka: do limitu w kategorii Zakupy spożywcze zostało',
    );
  });

  test('swears in the aggressive tone', () => {
    const aggressive = budget({ tone: 'aggressive' });
    const message = alertFor(aggressive, [payment('p', 9_500)], payment('q', 1_000));

    expect(`${message?.title} ${message?.body}`).toMatch(/k\*\*wa|ch\*j|popie\*\*\*liło|pi\*\*u|prze\*\*ny/);
  });

  test('stay quiet when notifications are off', () => {
    expect(alertFor(budget({ thresholdShares: [] }), [], payment('r', 12_000))).toBeNull();
  });
});
