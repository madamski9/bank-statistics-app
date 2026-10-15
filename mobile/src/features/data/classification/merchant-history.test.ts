import type { IngestionRecord } from '@bankstats/ingestion-native';
import { describe, expect, test } from 'bun:test';

import { privateRuleFor } from './categorization-rule';
import { matchesMerchantQuery, merchantHistory } from './merchant-history';

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

describe('merchantHistory', () => {
  test('lists each shop once with how often it was paid, most frequent first', () => {
    const history = merchantHistory(
      [
        record({ id: 'a', merchant: 'Latto Gelato' }),
        record({ id: 'b', merchant: 'Żabka' }),
        record({ id: 'c', merchant: 'Żabka' }),
      ],
      [],
    );

    expect(history.map((merchant) => [merchant.name, merchant.count])).toEqual([
      ['Żabka', 2],
      ['Latto Gelato', 1],
    ]);
  });

  test('skips income so only places you paid show up', () => {
    expect(merchantHistory([record({ direction: 'income' })], [])).toEqual([]);
  });

  test('reports the category the shop currently lands in', () => {
    const rules = [privateRuleFor('Latto Gelato', 'eatingOut')];
    const [merchant] = merchantHistory([record()], rules);

    expect(merchant?.category).toBe('eatingOut');
  });
});

describe('matchesMerchantQuery', () => {
  test('finds a shop by any part of its name regardless of case', () => {
    const [merchant] = merchantHistory([record()], []);

    expect(merchant !== undefined && matchesMerchantQuery(merchant, 'gela')).toBe(true);
    expect(merchant !== undefined && matchesMerchantQuery(merchant, 'pizza')).toBe(false);
  });
});
