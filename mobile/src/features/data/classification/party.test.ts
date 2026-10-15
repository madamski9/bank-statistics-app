import type { IngestionRecord } from '@bankstats/ingestion-native';
import { describe, expect, test } from 'bun:test';

import { classifyParty } from './party';

function record(overrides: Partial<IngestionRecord> = {}): IngestionRecord {
  return {
    id: 'record-1',
    bank: 'millennium',
    direction: 'expense',
    transactionType: 'cardPayment',
    amountMinor: 1234,
    currency: 'PLN',
    merchant: 'Żabka Gdańsk, Pomorskie',
    occurredAt: '2026-09-20T10:15:00.000Z',
    capturedAt: '2026-09-20T10:15:00.000Z',
    sourceApp: 'pl.millenniumbank.bankmillennium',
    status: 'pending',
    origin: 'capture',
    ...overrides,
  };
}

describe('classifyParty', () => {
  test('reads a card payment as a shop and keeps where it was', () => {
    expect(classifyParty(record())).toEqual({
      kind: 'merchant',
      name: 'Żabka',
      location: 'Gdańsk, Pomorskie',
    });
  });

  test('reads a transfer as a person on the other side', () => {
    const transfer = record({ transactionType: 'outgoingTransfer', merchant: 'Jan Kowalski' });

    expect(classifyParty(transfer)).toEqual({ kind: 'counterparty', name: 'Jan Kowalski' });
  });

  test('reads a person behind an unclassified movement, and a business as a shop', () => {
    const toPerson = record({ transactionType: undefined, merchant: 'Anna Nowak' });
    const toBusiness = record({ transactionType: undefined, merchant: 'Piekarnia Nowak' });

    expect(classifyParty(toPerson).kind).toBe('counterparty');
    expect(classifyParty(toBusiness).kind).toBe('merchant');
  });

  test('leaves an unnamed transaction without a party', () => {
    expect(classifyParty(record({ merchant: undefined }))).toEqual({ kind: 'unknown' });
    expect(classifyParty(record({ merchant: '   ' }))).toEqual({ kind: 'unknown' });
  });
});
