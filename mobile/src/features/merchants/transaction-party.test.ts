import type { IngestionRecord } from '@bankstats/ingestion-native';
import { describe, expect, test } from 'bun:test';

import { transactionParty } from './transaction-party';

function record(overrides: Partial<IngestionRecord> = {}): IngestionRecord {
  return {
    id: 'record-1',
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

describe('transactionParty', () => {
  test('names the shop a card payment was made in', () => {
    expect(transactionParty(record({ merchant: 'Lidl Gdańsk, Pomorskie' }), [])).toBe('Lidl');
  });

  test('names the recipient of a transfer', () => {
    expect(
      transactionParty(record({ transactionType: 'outgoingTransfer', merchant: 'Jan Kowalski' }), []),
    ).toBe('Jan Kowalski');
  });

  test('falls back to the transaction type when nobody is named', () => {
    expect(
      transactionParty(record({ transactionType: 'outgoingTransfer', merchant: undefined }), []),
    ).toBe('Przelew wychodzący');
  });
});
