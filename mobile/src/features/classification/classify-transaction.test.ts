import type { IngestionRecord } from '@bankstats/ingestion-native';
import { describe, expect, test } from 'bun:test';

import { privateRuleFor } from './categorization-rule';
import { uncategorizedCategory } from './categories';
import { classifyTransaction } from './classify-transaction';

function record(overrides: Partial<IngestionRecord> = {}): IngestionRecord {
  return {
    id: 'record-1',
    bank: 'millennium',
    direction: 'expense',
    transactionType: 'cardPayment',
    amountMinor: 1234,
    currency: 'PLN',
    merchant: 'ZABKA NANO Z7423',
    occurredAt: '2026-09-20T10:15:00.000Z',
    capturedAt: '2026-09-20T10:15:00.000Z',
    sourceApp: 'pl.millenniumbank.bankmillennium',
    status: 'pending',
    origin: 'capture',
    ...overrides,
  };
}

describe('classifyTransaction', () => {
  test('shows the canonical shop while keeping the label the bank sent', () => {
    const classified = classifyTransaction(record(), []);

    expect(classified.merchantName).toBe('Żabka');
    expect(classified.bankLabel).toBe('ZABKA NANO Z7423');
  });

  test('categorizes a known shop from the catalog', () => {
    expect(classifyTransaction(record(), []).category).toBe('groceries');
  });

  test('prefers the category the user put on this transaction', () => {
    const corrected = record({ category: 'eatingOut' });

    expect(classifyTransaction(corrected, []).category).toBe('eatingOut');
  });

  test('prefers a private rule over the catalog suggestion', () => {
    const rules = [privateRuleFor('Żabka', 'eatingOut')];

    expect(classifyTransaction(record(), rules).category).toBe('eatingOut');
    expect(classifyTransaction(record({ category: 'home' }), rules).category).toBe('home');
  });

  test('keeps an unknown shop uncategorized rather than hiding it', () => {
    const classified = classifyTransaction(record({ merchant: 'Latto Gelato' }), []);

    expect(classified.category).toBeUndefined();
    expect(classified.isUncategorized).toBe(true);
    expect(classified.categoryName).toBe('Bez kategorii');
  });

  test('counts a personal transfer as a counterparty, not a shop', () => {
    const transfer = record({ transactionType: 'outgoingTransfer', merchant: 'Jan Kowalski' });
    const classified = classifyTransaction(transfer, []);

    expect(classified.partyKind).toBe('counterparty');
    expect(classified.counterpartyName).toBe('Jan Kowalski');
    expect(classified.merchantName).toBeUndefined();
    expect(classified.category).toBe('transfers');
  });
});

describe('an explicit "no category" correction', () => {
  test('is not overruled by the catalog or by a private rule', () => {
    const cleared = record({ category: uncategorizedCategory });
    const rules = [privateRuleFor('Żabka', 'eatingOut')];

    expect(classifyTransaction(cleared, rules).category).toBeUndefined();
    expect(classifyTransaction(cleared, rules).isUncategorized).toBe(true);
    expect(classifyTransaction(cleared, rules).categoryName).toBe('Bez kategorii');
  });

  test('also holds for a personal transfer', () => {
    const transfer = record({
      transactionType: 'outgoingTransfer',
      merchant: 'Jan Kowalski',
      category: uncategorizedCategory,
    });

    expect(classifyTransaction(transfer, []).category).toBeUndefined();
  });
});
