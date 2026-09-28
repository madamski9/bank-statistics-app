import type { IngestionRecord } from '@bankstats/ingestion-native';
import { describe, expect, test } from 'bun:test';

import { categoryBreakdown } from './category-breakdown';

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

describe('categoryBreakdown', () => {
  test('shows where the money in a category went, largest first', () => {
    const entries = categoryBreakdown(
      [
        record({ merchant: 'Lidl Gdańsk, Pomorskie', amountMinor: 2500 }),
        record({ merchant: 'ZABKA NANO Z7423', amountMinor: 1000 }),
        record({ merchant: 'Żabka Gdańsk, Pomorskie', amountMinor: 1500 }),
        record({ merchant: 'Lidl', amountMinor: 5000 }),
      ],
      [],
    );

    expect(entries).toEqual([
      expect.objectContaining({ label: 'Lidl', amountMinor: 7500, count: 2, share: 0.75 }),
      expect.objectContaining({ label: 'Żabka', amountMinor: 2500, count: 2, share: 0.25 }),
    ]);
  });

  test('names a transfer by its recipient and a nameless one by its type', () => {
    const entries = categoryBreakdown(
      [
        record({ transactionType: 'outgoingTransfer', merchant: 'Jan Kowalski', amountMinor: 3000 }),
        record({ transactionType: 'outgoingTransfer', merchant: undefined, amountMinor: 1000 }),
      ],
      [],
    );

    expect(entries.map((entry) => entry.label)).toEqual(['Jan Kowalski', 'Przelew wychodzący']);
  });

  test('is empty when the category has no spending', () => {
    expect(categoryBreakdown([], [])).toEqual([]);
  });
});
