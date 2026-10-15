import type { IngestionRecord } from '@bankstats/ingestion-native';
import { describe, expect, test } from 'bun:test';

import {
  affectsStatistics,
  blocksStatistics,
  transactionBadge,
  transactionContext,
  transactionTitle,
} from './transaction-record';

function record(overrides: Partial<IngestionRecord> = {}): IngestionRecord {
  return {
    id: 'record-1',
    bank: 'millennium',
    direction: 'expense',
    transactionType: 'cardPayment',
    amountMinor: 1234,
    currency: 'PLN',
    merchant: 'SKLEP',
    occurredAt: '2026-09-20T10:15:00.000Z',
    capturedAt: '2026-09-20T10:15:00.000Z',
    sourceApp: 'pl.millenniumbank.bankmillennium',
    status: 'pending',
    origin: 'capture',
    ...overrides,
  };
}

describe('affectsStatistics', () => {
  test('counts a plain captured transaction', () => {
    expect(affectsStatistics(record())).toBe(true);
  });

  test('holds back an uncertain amount, currency or direction', () => {
    expect(blocksStatistics(record({ review: 'amount' }))).toBe(true);
    expect(affectsStatistics(record({ review: 'currency' }))).toBe(false);
    expect(affectsStatistics(record({ review: 'direction' }))).toBe(false);
  });

  test('keeps counting a transaction whose name is uncertain', () => {
    const uncategorized = record({ review: 'merchant', merchant: undefined });

    expect(blocksStatistics(uncategorized)).toBe(false);
    expect(affectsStatistics(uncategorized)).toBe(true);
    expect(transactionTitle(uncategorized, [])).toBe('Płatność kartą');
  });

  test('drops a reversed transaction', () => {
    expect(affectsStatistics(record({ status: 'reversed' }))).toBe(false);
  });
});

describe('transactionBadge', () => {
  test('stays quiet for a normal transaction', () => {
    expect(transactionBadge(record())).toBeNull();
    expect(transactionBadge(record({ origin: 'manual', bank: 'manual' }))).toBeNull();
  });

  test('marks the exceptional states', () => {
    expect(transactionBadge(record({ review: 'amount' }))?.label).toBe('Do sprawdzenia');
    expect(transactionBadge(record({ status: 'reversed' }))?.label).toBe('Cofnięta');
  });
});

describe('transactionContext', () => {
  test('names the bank and the financial account', () => {
    expect(transactionContext(record())).toBe('Millennium');
    expect(transactionContext(record({ accountName: 'Konto osobiste' }))).toBe(
      'Millennium · Konto osobiste',
    );
    expect(transactionContext(record({ bank: 'manual', origin: 'manual' }))).toBe('Wpis ręczny');
  });
});

describe('transactionTitle', () => {
  test('shows the canonical shop rather than the raw bank label', () => {
    expect(transactionTitle(record({ merchant: 'ZABKA NANO Z7423' }), [])).toBe('Żabka');
  });

  test('falls back to the category when no party is named', () => {
    expect(transactionTitle(record({ merchant: undefined, category: 'groceries' }), [])).toBe(
      'Zakupy spożywcze',
    );
  });

  test('names the person behind a transfer', () => {
    const transfer = record({ transactionType: 'outgoingTransfer', merchant: 'Jan Kowalski' });

    expect(transactionTitle(transfer, [])).toBe('Jan Kowalski');
  });
});
