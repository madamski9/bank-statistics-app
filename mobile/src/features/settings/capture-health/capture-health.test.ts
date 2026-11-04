import type { IngestionRecord, StorageDiagnostics } from '@bankstats/ingestion-native';
import { describe, expect, test } from 'bun:test';

import { captureHealth } from './capture-health';

const now = new Date('2026-09-30T12:00:00Z');
const diagnostics: StorageDiagnostics = { cipherVersion: '4.10', databasePath: '/outbox' };

function captured(bank: 'millennium' | 'pko' | 'mbank' | 'unknown', capturedAt: string): IngestionRecord {
  return {
    id: `${bank}-${capturedAt}`,
    bank,
    direction: 'expense',
    amountMinor: 1000,
    currency: 'PLN',
    merchant: 'Lidl',
    occurredAt: capturedAt,
    capturedAt,
    sourceApp: 'app',
    status: 'pending',
    origin: 'capture',
  };
}

function stateOf(health: ReturnType<typeof captureHealth>, bank: 'millennium' | 'pko' | 'mbank' | 'wallet') {
  const found = health.banks.find((entry) => entry.bank === bank);

  return [found?.state, found?.reason];
}

describe('capture health', () => {
  test('shows durable pending notifications without claiming a transaction was saved', () => {
    const health = captureHealth({
      records: [],
      diagnostics: {
        ...diagnostics,
        lastAttemptAt: '2026-09-29T10:00:00Z',
        lastAttemptOutcome: 'pending',
        pendingNotificationCount: '2',
      },
      enabledBanks: ['mbank'],
      now,
    });

    expect(health.pendingNotificationCount).toBe(2);
    expect(health.needsAttention).toBe(true);
    expect(stateOf(health, 'mbank')).toEqual(['attention', 'pendingNotification']);
  });

  test('does not attribute a pending notification to every enabled bank', () => {
    const health = captureHealth({
      records: [],
      diagnostics: { ...diagnostics, pendingNotificationCount: '1' },
      enabledBanks: ['mbank', 'pko'],
      now,
    });

    expect(health.needsAttention).toBe(true);
    expect(stateOf(health, 'mbank')).toEqual(['unverified', 'neverRan']);
    expect(stateOf(health, 'pko')).toEqual(['unverified', 'neverRan']);
  });

  test('clears the warning when the inbox was processed or expired', () => {
    const health = captureHealth({
      records: [captured('mbank', '2026-09-29T10:00:00Z')],
      diagnostics: { ...diagnostics, lastAttemptOutcome: 'pending', pendingNotificationCount: '0' },
      enabledBanks: ['mbank'],
      now,
    });

    expect(health.needsAttention).toBe(false);
    expect(stateOf(health, 'mbank')).toEqual(['working', null]);
  });

  test('tracks an enabled mBank automation and its captured transfers', () => {
    const health = captureHealth({
      records: [captured('mbank', '2026-09-29T10:00:00Z')],
      diagnostics,
      enabledBanks: ['mbank'],
      now,
    });

    expect(stateOf(health, 'mbank')).toEqual(['working', null]);
    expect(stateOf(health, 'millennium')).toEqual(['unconfigured', null]);
  });

  test('reports a bank that captured recently as working', () => {
    const health = captureHealth({
      records: [captured('millennium', '2026-09-29T10:00:00Z')],
      diagnostics: { ...diagnostics, lastAttemptAt: '2026-09-29T10:00:00Z', lastAttemptOutcome: 'success' },
      enabledBanks: ['millennium'],
      now,
    });

    expect(stateOf(health, 'millennium')).toEqual(['working', null]);
    expect(stateOf(health, 'pko')).toEqual(['unconfigured', null]);
    expect(health.needsAttention).toBe(false);
  });

  test('does not claim a chosen bank is broken without evidence', () => {
    const health = captureHealth({ records: [], diagnostics, enabledBanks: ['pko'], now });

    expect(stateOf(health, 'pko')).toEqual(['unverified', 'neverRan']);
  });

  test('asks for attention after a recent failure newer than the last capture', () => {
    const health = captureHealth({
      records: [captured('millennium', '2026-09-20T10:00:00Z')],
      diagnostics: {
        ...diagnostics,
        lastAttemptAt: '2026-09-28T10:00:00Z',
        lastAttemptOutcome: 'failure',
        lastFailureAt: '2026-09-28T10:00:00Z',
        lastFailureReason: 'database',
      },
      enabledBanks: ['millennium'],
      now,
    });

    expect(stateOf(health, 'millennium')).toEqual(['attention', 'recentFailure']);
  });

  test('forgets an old failure that later captures already recovered from', () => {
    const health = captureHealth({
      records: [captured('millennium', '2026-09-29T10:00:00Z')],
      diagnostics: { ...diagnostics, lastFailureAt: '2026-09-10T10:00:00Z' },
      enabledBanks: ['millennium'],
      now,
    });

    expect(stateOf(health, 'millennium')).toEqual(['working', null]);
  });

  test('does not treat a month without transactions as a failure', () => {
    const health = captureHealth({
      records: [captured('pko', '2026-08-01T10:00:00Z')],
      diagnostics,
      enabledBanks: ['pko'],
      now,
    });

    expect(stateOf(health, 'pko')).toEqual(['unverified', 'staleEvidence']);
  });

  test('a successful run confirms the only enabled bank without a purchase', () => {
    const health = captureHealth({
      records: [],
      diagnostics: { ...diagnostics, lastAttemptAt: '2026-09-29T10:00:00Z', lastAttemptOutcome: 'ignored' },
      enabledBanks: ['pko'],
      now,
    });

    expect(stateOf(health, 'pko')).toEqual(['working', null]);
  });

  test('a run of unknown bank does not verify both enabled banks', () => {
    const health = captureHealth({
      records: [captured('millennium', '2026-09-29T10:00:00Z')],
      diagnostics: { ...diagnostics, lastAttemptAt: '2026-09-29T10:00:00Z', lastAttemptOutcome: 'success' },
      enabledBanks: ['millennium', 'pko'],
      now,
    });

    expect(stateOf(health, 'millennium')).toEqual(['working', null]);
    expect(stateOf(health, 'pko')).toEqual(['unverified', 'neverRan']);
  });

  test('a recent successful run keeps a quiet bank verified', () => {
    const health = captureHealth({
      records: [captured('pko', '2026-08-01T10:00:00Z')],
      diagnostics: { ...diagnostics, lastAttemptAt: '2026-09-29T10:00:00Z', lastAttemptOutcome: 'success' },
      enabledBanks: ['pko'],
      now,
    });

    expect(stateOf(health, 'pko')).toEqual(['working', null]);
  });

  test('reports Wallet capture only for a Wallet-only setup', () => {
    const records = [captured('unknown', '2026-09-29T10:00:00Z')];
    const walletOnly = captureHealth({ records, diagnostics, enabledBanks: ['wallet'], now });
    const withBanks = captureHealth({ records, diagnostics, enabledBanks: ['millennium'], now });

    expect(stateOf(walletOnly, 'wallet')).toEqual(['working', null]);
    expect(withBanks.banks.some((entry) => entry.bank === 'wallet')).toBe(false);
  });
});
