import type { IngestionRecord } from '@bankstats/ingestion-native';
import { describe, expect, test } from 'bun:test';

import { merchantOptions } from './merchant-options';

function record(merchant: string, overrides: Partial<IngestionRecord> = {}): IngestionRecord {
  return {
    id: merchant,
    bank: 'manual',
    direction: 'expense',
    transactionType: 'cardPayment',
    amountMinor: 1000,
    currency: 'PLN',
    merchant,
    occurredAt: '2026-09-20T10:00:00.000Z',
    capturedAt: '2026-09-20T10:00:00.000Z',
    sourceApp: 'manual',
    status: 'posted',
    origin: 'manual',
    ...overrides,
  };
}

describe('merchantOptions', () => {
  test('offers each classified PLN shop once across the full transaction history', () => {
    const options = merchantOptions(
      [
        record('Żabka', { occurredAt: '2026-01-10T10:00:00.000Z' }),
        record('ZABKA NANO Z7423'),
        record('Lidl'),
        record('Jan Kowalski', { transactionType: 'outgoingTransfer' }),
        record('Empik', { currency: 'EUR' }),
        record('Biedronka', { status: 'reversed' }),
      ],
      [],
    );

    expect(options.map(({ key }) => key)).toEqual(['lidl', 'żabka']);
  });
});
