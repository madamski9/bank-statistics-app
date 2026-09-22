import type { IngestionRecord } from '@bankstats/ingestion-native';
import { describe, expect, test } from 'bun:test';

import {
  categoryFromRules,
  privateRuleFor,
  upsertRule,
  type CategorizationRule,
} from './categorization-rule';
import { resolveMerchant } from './merchant-alias';

function record(overrides: Partial<IngestionRecord> = {}): IngestionRecord {
  return {
    id: 'record-1',
    bank: 'millennium',
    direction: 'expense',
    transactionType: 'cardPayment',
    amountMinor: 1234,
    currency: 'PLN',
    merchant: 'Latto Gelato',
    occurredAt: '2026-09-20T10:15:00.000Z',
    capturedAt: '2026-09-20T10:15:00.000Z',
    sourceApp: 'pl.millenniumbank.bankmillennium',
    status: 'pending',
    origin: 'capture',
    ...overrides,
  };
}

describe('privateRuleFor', () => {
  test('remembers a correction for future transactions from the same shop', () => {
    const rule = privateRuleFor('Latto Gelato', 'eatingOut');

    expect(categoryFromRules(record(), [rule])).toBe('eatingOut');
  });

  test('matches every spelling the shop arrives under', () => {
    const rule = privateRuleFor('ZABKA NANO Z7423', 'groceries');

    expect(categoryFromRules(record({ merchant: 'Żabka Gdańsk, Pomorskie' }), [rule])).toBe(
      'groceries',
    );
  });

  test('leaves another shop alone', () => {
    const rule = privateRuleFor('Latto Gelato', 'eatingOut');

    expect(categoryFromRules(record({ merchant: 'Lidl' }), [rule])).toBeNull();
  });

  test('stays private and never joins the shared alias catalog', () => {
    privateRuleFor('Moja Kawiarnia', 'eatingOut');

    expect(resolveMerchant('Moja Kawiarnia').isAlias).toBe(false);
  });
});

describe('upsertRule', () => {
  test('replaces the rule the user already had for that shop', () => {
    const rules: CategorizationRule[] = [privateRuleFor('Latto Gelato', 'other')];
    const updated = upsertRule(rules, privateRuleFor('Latto Gelato', 'eatingOut'));

    expect(updated).toHaveLength(1);
    expect(categoryFromRules(record(), updated)).toBe('eatingOut');
  });

  test('keeps rules for other shops', () => {
    const rules = upsertRule(
      [privateRuleFor('Lidl', 'groceries')],
      privateRuleFor('Latto Gelato', 'eatingOut'),
    );

    expect(rules).toHaveLength(2);
  });
});
