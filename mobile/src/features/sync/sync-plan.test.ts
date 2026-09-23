import type { IngestionRecord } from '@bankstats/ingestion-native';
import { describe, expect, test } from 'bun:test';

import { fingerprintOf, planSync, type SyncLedger } from './sync-plan';
import { changeFromRecord, transactionCodec, type RemoteTransaction } from './transaction-codec';

const now = 1_800_000_000_000;

function manual(overrides: Partial<IngestionRecord> = {}): IngestionRecord {
  return {
    id: 'manual-lunch',
    bank: 'manual',
    direction: 'expense',
    amountMinor: 3450,
    currency: 'PLN',
    merchant: 'Bistro',
    accountId: 'general-manual',
    occurredAt: '2026-09-20T12:30:00.000Z',
    capturedAt: '2026-09-20T12:31:00.000Z',
    sourceApp: 'manual',
    status: 'posted',
    origin: 'manual',
    ...overrides,
  };
}

function remote(record: IngestionRecord, revision: number, deleted = false): RemoteTransaction {
  return { ...changeFromRecord(record), revision, deleted };
}

function fingerprint(record: IngestionRecord): string {
  return fingerprintOf(changeFromRecord(record));
}

function plan(input: Parameters<typeof planSync<IngestionRecord, ReturnType<typeof changeFromRecord>>>[0]) {
  return planSync(input, transactionCodec);
}

function synced(record: IngestionRecord, revision: number): SyncLedger {
  return { [record.id]: { revision, fingerprint: fingerprint(record) } };
}

describe('planSync', () => {
  test('pushes a manual transaction the cloud has never seen', () => {
    const lunch = manual();

    const result = plan({ local: [lunch], remote: [], ledger: {}, now });

    expect(result.push).toEqual([{ ...changeFromRecord(lunch), revision: now, deleted: false }]);
    expect(result.ledger[lunch.id]).toEqual({ revision: now, fingerprint: fingerprint(lunch) });
  });

  test('leaves captured transactions to their own synchronization', () => {
    const captured = manual({ id: 'capture-1', bank: 'millennium', origin: 'capture' });

    const result = plan({ local: [captured], remote: [], ledger: {}, now });

    expect(result.push).toEqual([]);
  });

  test('does nothing when both sides still match the last synchronization', () => {
    const lunch = manual();

    const result = plan({
      local: [lunch],
      remote: [remote(lunch, 4)],
      ledger: synced(lunch, 4),
      now,
    });

    expect(result).toMatchObject({ push: [], saveLocally: [], removeLocally: [] });
  });

  test('pushes a local edit with a revision newer than any known one', () => {
    const lunch = manual();
    const edited = manual({ amountMinor: 4000 });

    const result = plan({
      local: [edited],
      remote: [remote(lunch, now + 50)],
      ledger: synced(lunch, now + 50),
      now,
    });

    expect(result.push).toEqual([{ ...changeFromRecord(edited), revision: now + 51, deleted: false }]);
  });

  test('pushes a tombstone for a transaction removed on this device', () => {
    const lunch = manual();

    const result = plan({ local: [], remote: [remote(lunch, 4)], ledger: synced(lunch, 4), now });

    expect(result.push).toEqual([{ ...changeFromRecord(lunch), revision: now, deleted: true }]);
    expect(result.ledger[lunch.id]).toEqual({ revision: now, fingerprint: null });
  });

  test('saves a transaction entered on another device', () => {
    const lunch = manual();

    const result = plan({ local: [], remote: [remote(lunch, 7)], ledger: {}, now });

    expect(result.saveLocally).toEqual([lunch]);
    expect(result.pulledLedger[lunch.id]).toEqual({ revision: 7, fingerprint: fingerprint(lunch) });
    expect(result.push).toEqual([]);
  });

  test('applies an edit made on another device to an unchanged local copy', () => {
    const lunch = manual();
    const editedElsewhere = manual({ merchant: 'Bistro Gdańsk' });

    const result = plan({
      local: [lunch],
      remote: [remote(editedElsewhere, 9)],
      ledger: synced(lunch, 4),
      now,
    });

    expect(result.saveLocally).toEqual([editedElsewhere]);
    expect(result.push).toEqual([]);
  });

  test('removes a transaction removed on another device', () => {
    const lunch = manual();

    const result = plan({
      local: [lunch],
      remote: [remote(lunch, 9, true)],
      ledger: synced(lunch, 4),
      now,
    });

    expect(result.removeLocally).toEqual([lunch.id]);
    expect(result.pulledLedger[lunch.id]).toEqual({ revision: 9, fingerprint: null });
  });

  test('does not bring back a transaction removed elsewhere that this device never had', () => {
    const lunch = manual();

    const result = plan({ local: [], remote: [remote(lunch, 9, true)], ledger: {}, now });

    expect(result).toMatchObject({ push: [], saveLocally: [], removeLocally: [] });
  });

  test('keeps the edit made on this device when both devices changed the same transaction', () => {
    const lunch = manual();
    const editedHere = manual({ amountMinor: 4000 });
    const editedElsewhere = manual({ amountMinor: 5000 });

    const result = plan({
      local: [editedHere],
      remote: [remote(editedElsewhere, 9)],
      ledger: synced(lunch, 4),
      now,
    });

    expect(result.saveLocally).toEqual([]);
    expect(result.push).toEqual([{ ...changeFromRecord(editedHere), revision: now, deleted: false }]);
  });

  test('adopts a matching cloud copy after the ledger was lost instead of pushing it again', () => {
    const lunch = manual();

    const result = plan({ local: [lunch], remote: [remote(lunch, 9)], ledger: {}, now });

    expect(result.push).toEqual([]);
    expect(result.ledger[lunch.id]).toEqual({ revision: 9, fingerprint: fingerprint(lunch) });
  });

  test('takes the cloud copy when this device has no history of the transaction', () => {
    const stale = manual({ amountMinor: 1000 });
    const current = manual({ amountMinor: 2000 });

    const result = plan({ local: [stale], remote: [remote(current, 9)], ledger: {}, now });

    expect(result.push).toEqual([]);
    expect(result.saveLocally).toEqual([current]);
  });

  test('does not bring back a transaction removed elsewhere when this device has no history', () => {
    const lunch = manual();

    const result = plan({ local: [lunch], remote: [remote(lunch, 9, true)], ledger: {}, now });

    expect(result.push).toEqual([]);
    expect(result.removeLocally).toEqual([lunch.id]);
  });

  test('settles on the cloud copy when another device won a push with the same revision', () => {
    const mine = manual({ amountMinor: 4000 });
    const theirs = manual({ amountMinor: 5000 });

    const result = plan({
      local: [mine],
      remote: [remote(theirs, 9)],
      ledger: synced(mine, 9),
      now,
    });

    expect(result.push).toEqual([]);
    expect(result.saveLocally).toEqual([theirs]);
  });

  test('forgets a removal once the cloud has let its tombstone go', () => {
    const result = plan({
      local: [],
      remote: [],
      ledger: { 'manual-lunch': { revision: 4, fingerprint: null } },
      now,
    });

    expect(result.ledger).toEqual({});
    expect(result.pulledLedger).toEqual({});
  });

  test('forgets a removal the cloud never received', () => {
    const lunch = manual();

    const result = plan({ local: [], remote: [], ledger: synced(lunch, 4), now });

    expect(result.push).toEqual([]);
    expect(result.ledger).toEqual({});
  });

  test('sends only the fields a transaction actually has', () => {
    const change = changeFromRecord(manual({ merchant: undefined, category: undefined }));

    expect(Object.keys(change)).not.toContain('merchant');
    expect(Object.keys(change)).not.toContain('category');
  });

  test('files an older manual transaction without an account under the general manual account', () => {
    const legacy = manual({ accountId: undefined });

    expect(changeFromRecord(legacy).accountId).toBe('general-manual');
  });
});
