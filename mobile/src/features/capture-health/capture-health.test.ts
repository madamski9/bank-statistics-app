import type { IngestionRecord, StorageDiagnostics } from '@bankstats/ingestion-native';
import { describe, expect, test } from 'bun:test';

import { captureHealth } from './capture-health';

const now = new Date('2026-09-30T12:00:00Z');
const diagnostics: StorageDiagnostics = { cipherVersion: '4.10', databasePath: '/outbox' };

function captured(bank: 'millennium' | 'pko', capturedAt: string): IngestionRecord {
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

function stateOf(health: ReturnType<typeof captureHealth>, bank: 'millennium' | 'pko') {
  const found = health.banks.find((entry) => entry.bank === bank);

  return [found?.state, found?.reason];
}

describe('capture health', () => {
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

  test('asks for attention when the automation for a chosen bank has never run', () => {
    const health = captureHealth({ records: [], diagnostics, enabledBanks: ['pko'], now });

    expect(stateOf(health, 'pko')).toEqual(['attention', 'neverRan']);
  });

  test('asks for attention after a recent failure newer than the last capture', () => {
    const health = captureHealth({
      records: [captured('millennium', '2026-09-20T10:00:00Z')],
      diagnostics: { ...diagnostics, lastFailureAt: '2026-09-28T10:00:00Z', lastFailureReason: 'database' },
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

  test('points out a bank that has been quiet for a month', () => {
    const health = captureHealth({
      records: [captured('pko', '2026-08-01T10:00:00Z')],
      diagnostics,
      enabledBanks: ['pko'],
      now,
    });

    expect(stateOf(health, 'pko')).toEqual(['attention', 'quiet']);
  });
});
