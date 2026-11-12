import type { IngestionRecord } from '@bankstats/ingestion-native';
import { describe, expect, test } from 'bun:test';

import {
  affectsStatistics,
  awaitsWalletMerchant,
  blocksStatistics,
  transactionBadge,
  transactionContext,
  transactionTitle,
  declinedWalletWait,
  withoutWalletWait,
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

const capturedAt = Date.parse('2026-09-20T10:15:00.000Z');

describe('transactionBadge', () => {
  test('stays quiet for a normal transaction', () => {
    expect(transactionBadge(record(), capturedAt)).toBeNull();
    expect(transactionBadge(record({ origin: 'manual', bank: 'manual' }), capturedAt)).toBeNull();
  });

  test('marks the exceptional states', () => {
    expect(transactionBadge(record({ review: 'amount' }), capturedAt)?.label).toBe('Do sprawdzenia');
    expect(transactionBadge(record({ status: 'reversed' }), capturedAt)?.label).toBe('Cofnięta');
  });

  test('marks a Millennium card payment without a shop while Wallet can still name it', () => {
    const debitPush = record({ merchant: undefined });

    expect(transactionBadge(debitPush, capturedAt + 60_000)).toEqual({ label: 'Czeka na Portfel', tone: 'neutral' });
    expect(transactionBadge(debitPush, capturedAt + 59 * 60_000)?.label).toBe('Czeka na Portfel');
    expect(transactionBadge(debitPush, capturedAt + 60 * 60_000)).toBeNull();
  });
});

describe('awaitsWalletMerchant', () => {
  test('waits for a card payment pushed by the bank app', () => {
    const soon = capturedAt + 60_000;

    expect(awaitsWalletMerchant(record({ merchant: undefined }), soon)).toBe(true);
    expect(awaitsWalletMerchant(record(), soon)).toBe(false);
    expect(awaitsWalletMerchant(record({ merchant: undefined, origin: 'manual' }), soon)).toBe(false);
    expect(awaitsWalletMerchant(record({ merchant: undefined, transactionType: 'outgoingTransfer' }), soon)).toBe(false);
  });

  test('waits for an mBank card push even though it names the shop', () => {
    const mbankPush = record({ bank: 'mbank', sourceApp: 'pl.mbank', merchant: 'HTTPSAPPSURFBURG GDANSK' });

    expect(awaitsWalletMerchant(mbankPush, capturedAt + 60_000)).toBe(true);
    expect(awaitsWalletMerchant(mbankPush, capturedAt + 60 * 60_000)).toBe(false);
    expect(transactionBadge(mbankPush, capturedAt + 60_000)?.label).toBe('Czeka na Portfel');
  });

  test('waits for card pushes of every supported bank', () => {
    const soon = capturedAt + 60_000;

    for (const [bank, sourceApp] of [['pko', 'pl.pkobp.iko'], ['ing', 'pl.ing.mojeing'], ['erste', 'pl.erste']] as const) {
      expect(awaitsWalletMerchant(record({ bank, sourceApp }), soon)).toBe(true);
    }
  });

  test('never waits on the Wallet side of a pair', () => {
    const soon = capturedAt + 60_000;

    expect(awaitsWalletMerchant(record({ bank: 'mbank', sourceApp: 'com.apple.Passbook' }), soon)).toBe(false);
    expect(awaitsWalletMerchant(record({ bank: 'unknown', sourceApp: 'com.apple.Passbook' }), soon)).toBe(false);
  });

  test('keeps waiting as long as an operation time stated after the capture allows', () => {
    const late = record({ merchant: undefined, occurredAt: '2026-09-20T10:45:00.000Z' });

    expect(awaitsWalletMerchant(late, capturedAt + 70 * 60_000)).toBe(true);
    expect(awaitsWalletMerchant(late, capturedAt + 90 * 60_000)).toBe(false);
  });

  test('declines only a payment that is still waiting', () => {
    const waiting = record({ bank: 'mbank', sourceApp: 'pl.mbank' });
    const named = { ...waiting, merchant: 'Surfburg', walletPairing: 'paired' as const };

    expect(declinedWalletWait(waiting, capturedAt + 60_000)?.walletPairing).toBe('declined');
    expect(declinedWalletWait(named, capturedAt + 60_000)).toBeNull();
    expect(declinedWalletWait(undefined, capturedAt + 60_000)).toBeNull();
  });

  test('stops waiting once Wallet has named the payment', () => {
    const named = record({ bank: 'mbank', sourceApp: 'pl.mbank', merchant: 'Surfburg', walletPairing: 'paired' });

    expect(awaitsWalletMerchant(named, capturedAt + 60_000)).toBe(false);
  });

  test('stops waiting once the user declines the Wallet pairing', () => {
    const declined = withoutWalletWait(record({ merchant: undefined }));

    expect(declined.walletPairing).toBe('declined');
    expect(awaitsWalletMerchant(declined, capturedAt + 60_000)).toBe(false);
    expect(transactionBadge(declined, capturedAt + 60_000)).toBeNull();
  });
});

describe('transactionContext', () => {
  test('shows the Wallet title until a bank name is confirmed, then uses the chosen name', () => {
    const captured = record({ bank: 'unknown', notificationTitle: 'Trade Republic' });
    expect(transactionContext(captured)).toBe('Portfel · Trade Republic');
    expect(transactionContext({ ...captured, bankName: 'Mój bank' })).toBe('Mój bank');
    expect(transactionContext({ ...captured, bankName: 'Mój bank', accountName: 'Karta' })).toBe('Mój bank · Karta');
    expect(transactionContext(record({ bankName: 'Błędna nazwa', notificationTitle: 'Trade Republic' }))).toBe('Millennium');
  });
  test('names an unknown captured bank without attributing it to Millennium', () => {
    expect(transactionContext(record({ bank: 'unknown' }))).toBe('Portfel');
  });

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
