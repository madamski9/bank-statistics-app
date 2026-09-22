import type { IngestionRecord } from '@bankstats/ingestion-native';
import { describe, expect, test } from 'bun:test';

import { alertProgress } from './alert-evaluation';
import type { AlertRule } from './alert-rule';

const reference = new Date(2026, 8, 22, 17, 44);

function record(overrides: Partial<IngestionRecord> = {}): IngestionRecord {
  return {
    id: `record-${Math.random()}`,
    bank: 'millennium',
    direction: 'expense',
    transactionType: 'cardPayment',
    amountMinor: 1000,
    currency: 'PLN',
    merchant: 'Żabka',
    occurredAt: new Date(2026, 8, 20, 10, 0).toISOString(),
    capturedAt: new Date(2026, 8, 20, 10, 0).toISOString(),
    sourceApp: 'pl.millenniumbank.bankmillennium',
    status: 'pending',
    origin: 'capture',
    ...overrides,
  };
}

function rule(overrides: Partial<AlertRule> = {}): AlertRule {
  return {
    id: 'rule-1',
    metric: 'expense',
    scope: { kind: 'all' },
    period: { kind: 'month' },
    condition: 'threshold',
    targetMinor: 50_000,
    thresholdShares: [1],
    isActive: true,
    createdAt: reference.toISOString(),
    ...overrides,
  };
}

describe('alertProgress', () => {
  test('sums the expenses of the running period', () => {
    const progress = alertProgress(rule(), [record(), record({ amountMinor: 2500 })], {
      reference,
      rules: [],
    });

    expect(progress.amountMinor).toBe(3500);
    expect(progress.targetMinor).toBe(50_000);
  });

  test('leaves out what happened before the period began', () => {
    const lastMonth = record({ occurredAt: new Date(2026, 7, 30, 10, 0).toISOString() });

    expect(alertProgress(rule(), [record(), lastMonth], { reference, rules: [] }).amountMinor).toBe(
      1000,
    );
  });

  test('leaves out a transaction that is still held back from statistics', () => {
    const held = record({ review: 'amount', amountMinor: 90_000 });
    const reversed = record({ status: 'reversed', amountMinor: 90_000 });

    expect(
      alertProgress(rule(), [record(), held, reversed], { reference, rules: [] }).amountMinor,
    ).toBe(1000);
  });

  test('counts only the shop a merchant rule watches', () => {
    const merchantRule = rule({
      scope: { kind: 'merchant', key: 'żabka', name: 'Żabka' },
    });
    const records = [
      record({ merchant: 'ZABKA NANO Z7423' }),
      record({ merchant: 'Lidl', amountMinor: 8000 }),
    ];

    expect(alertProgress(merchantRule, records, { reference, rules: [] }).amountMinor).toBe(1000);
  });

  test('counts a category across the shops inside it', () => {
    const categoryRule = rule({ scope: { kind: 'category', id: 'groceries' } });
    const records = [record(), record({ merchant: 'Lidl', amountMinor: 2000 }), record({ merchant: 'Empik', amountMinor: 9000 })];

    expect(alertProgress(categoryRule, records, { reference, rules: [] }).amountMinor).toBe(3000);
  });

  test('counts the person a counterparty rule watches', () => {
    const personRule = rule({ scope: { kind: 'counterparty', name: 'Jan Kowalski' } });
    const records = [
      record({ transactionType: 'outgoingTransfer', merchant: 'JAN KOWALSKI', amountMinor: 4000 }),
      record(),
    ];

    expect(alertProgress(personRule, records, { reference, rules: [] }).amountMinor).toBe(4000);
  });

  test('reads income and net flow as their own metrics', () => {
    const income = record({ direction: 'income', transactionType: 'incomingTransfer', merchant: undefined, amountMinor: 120_000 });
    const records = [record(), income];

    expect(alertProgress(rule({ metric: 'income' }), records, { reference, rules: [] }).amountMinor).toBe(
      120_000,
    );
    expect(alertProgress(rule({ metric: 'netFlow' }), records, { reference, rules: [] }).amountMinor).toBe(
      119_000,
    );
  });
});
