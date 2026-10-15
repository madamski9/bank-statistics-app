import type { IngestionRecord } from '@bankstats/ingestion-native';
import { describe, expect, test } from 'bun:test';

import { privateRuleFor } from './categorization-rule';
import { groupSpending } from './spending-groups';

const window = { startMs: null, endMs: Date.parse('2026-09-30T00:00:00.000Z') };

function record(overrides: Partial<IngestionRecord> = {}): IngestionRecord {
  return {
    id: `record-${Math.random()}`,
    bank: 'millennium',
    direction: 'expense',
    transactionType: 'cardPayment',
    amountMinor: 1000,
    currency: 'PLN',
    merchant: 'Żabka',
    occurredAt: '2026-09-20T10:15:00.000Z',
    capturedAt: '2026-09-20T10:15:00.000Z',
    sourceApp: 'pl.millenniumbank.bankmillennium',
    status: 'pending',
    origin: 'capture',
    ...overrides,
  };
}

describe('groupSpending by merchant', () => {
  test('files two spellings of one chain under a single shop', () => {
    const groups = groupSpending(
      [record({ merchant: 'ZABKA NANO Z7423' }), record({ merchant: 'Żabka Gdańsk, Pomorskie' })],
      { window, rules: [], dimension: 'merchant' },
    );

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ name: 'Żabka', totalMinor: 2000, count: 2 });
  });

  test('leaves personal transfers out of shop statistics', () => {
    const groups = groupSpending(
      [record(), record({ transactionType: 'outgoingTransfer', merchant: 'Jan Kowalski' })],
      { window, rules: [], dimension: 'merchant' },
    );

    expect(groups.map((group) => group.name)).toEqual(['Żabka']);
    expect(groups[0].share).toBe(1);
  });

  test('ignores a transaction whose amount is still in review', () => {
    const groups = groupSpending([record(), record({ review: 'amount', amountMinor: 90_000 })], {
      window,
      rules: [],
      dimension: 'merchant',
    });

    expect(groups[0].totalMinor).toBe(1000);
  });
});

describe('groupSpending by counterparty', () => {
  test('ranks the people money went to', () => {
    const groups = groupSpending(
      [
        record({ transactionType: 'outgoingTransfer', merchant: 'Jan Kowalski', amountMinor: 500 }),
        record({ transactionType: 'outgoingTransfer', merchant: 'JAN KOWALSKI', amountMinor: 700 }),
        record(),
      ],
      { window, rules: [], dimension: 'counterparty' },
    );

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ name: 'Jan Kowalski', totalMinor: 1200, count: 2 });
  });
});

describe('groupSpending by category', () => {
  test('sums a category across the shops inside it', () => {
    const groups = groupSpending([record(), record({ merchant: 'Lidl', amountMinor: 2500 })], {
      window,
      rules: [],
      dimension: 'category',
    });

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ name: 'Zakupy spożywcze', totalMinor: 3500, count: 2 });
  });

  test('keeps uncategorized spending visible instead of dropping it', () => {
    const groups = groupSpending([record({ merchant: 'Latto Gelato', amountMinor: 1800 })], {
      window,
      rules: [],
      dimension: 'category',
    });

    expect(groups[0]).toMatchObject({ name: 'Bez kategorii', totalMinor: 1800 });
  });

  test('follows a correction the user made on the transaction', () => {
    const groups = groupSpending([record({ category: 'eatingOut' })], {
      window,
      rules: [],
      dimension: 'category',
    });

    expect(groups[0].name).toBe('Jedzenie na mieście');
  });

  test('follows a private rule the user kept for that shop', () => {
    const groups = groupSpending([record()], {
      window,
      rules: [privateRuleFor('Żabka', 'eatingOut')],
      dimension: 'category',
    });

    expect(groups[0].name).toBe('Jedzenie na mieście');
  });
});
