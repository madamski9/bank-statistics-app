import type { IngestionRecord } from '@bankstats/ingestion-native';
import { describe, expect, test } from 'bun:test';

import { changeFromRecord, fingerprint, planSync, type RemoteTransaction, type SyncLedger } from './sync-plan';

const now = 1_800_000_000_000;

function manual(overrides: Partial<IngestionRecord> = {}): IngestionRecord {
  return {
    id: 'manual-lunch',
    bank: 'manual',
    direction: 'expense',
    amountMinor: 3450,
    currency: 'PLN',
    merchant: 'Bistro',
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

function synced(record: IngestionRecord, revision: number): SyncLedger {
  return { [record.id]: { revision, fingerprint: fingerprint(record) } };
}

describe('planSync', () => {
  test('pushes a manual transaction the cloud has never seen', () => {
    const lunch = manual();

    const plan = planSync({ local: [lunch], remote: [], ledger: {}, now });

    expect(plan.push).toEqual([{ ...changeFromRecord(lunch), revision: now, deleted: false }]);
    expect(plan.ledger[lunch.id]).toEqual({ revision: now, fingerprint: fingerprint(lunch) });
  });

  test('leaves captured transactions to their own synchronization', () => {
    const captured = manual({ id: 'capture-1', bank: 'millennium', origin: 'capture' });

    const plan = planSync({ local: [captured], remote: [], ledger: {}, now });

    expect(plan.push).toEqual([]);
  });

  test('does nothing when both sides still match the last synchronization', () => {
    const lunch = manual();

    const plan = planSync({
      local: [lunch],
      remote: [remote(lunch, 4)],
      ledger: synced(lunch, 4),
      now,
    });

    expect(plan).toMatchObject({ push: [], saveLocally: [], removeLocally: [] });
  });

  test('pushes a local edit with a revision newer than any known one', () => {
    const lunch = manual();
    const edited = manual({ amountMinor: 4000 });

    const plan = planSync({
      local: [edited],
      remote: [remote(lunch, now + 50)],
      ledger: synced(lunch, now + 50),
      now,
    });

    expect(plan.push).toEqual([{ ...changeFromRecord(edited), revision: now + 51, deleted: false }]);
  });

  test('pushes a tombstone for a transaction removed on this device', () => {
    const lunch = manual();

    const plan = planSync({ local: [], remote: [remote(lunch, 4)], ledger: synced(lunch, 4), now });

    expect(plan.push).toEqual([{ ...changeFromRecord(lunch), revision: now, deleted: true }]);
    expect(plan.ledger[lunch.id]).toEqual({ revision: now, fingerprint: null });
  });

  test('saves a transaction entered on another device', () => {
    const lunch = manual();

    const plan = planSync({ local: [], remote: [remote(lunch, 7)], ledger: {}, now });

    expect(plan.saveLocally).toEqual([lunch]);
    expect(plan.pulledLedger[lunch.id]).toEqual({ revision: 7, fingerprint: fingerprint(lunch) });
    expect(plan.push).toEqual([]);
  });

  test('applies an edit made on another device to an unchanged local copy', () => {
    const lunch = manual();
    const editedElsewhere = manual({ merchant: 'Bistro Gdańsk' });

    const plan = planSync({
      local: [lunch],
      remote: [remote(editedElsewhere, 9)],
      ledger: synced(lunch, 4),
      now,
    });

    expect(plan.saveLocally).toEqual([editedElsewhere]);
    expect(plan.push).toEqual([]);
  });

  test('removes a transaction removed on another device', () => {
    const lunch = manual();

    const plan = planSync({
      local: [lunch],
      remote: [remote(lunch, 9, true)],
      ledger: synced(lunch, 4),
      now,
    });

    expect(plan.removeLocally).toEqual([lunch.id]);
    expect(plan.pulledLedger[lunch.id]).toEqual({ revision: 9, fingerprint: null });
  });

  test('does not bring back a transaction removed elsewhere that this device never had', () => {
    const lunch = manual();

    const plan = planSync({ local: [], remote: [remote(lunch, 9, true)], ledger: {}, now });

    expect(plan).toMatchObject({ push: [], saveLocally: [], removeLocally: [] });
  });

  test('keeps the edit made on this device when both devices changed the same transaction', () => {
    const lunch = manual();
    const editedHere = manual({ amountMinor: 4000 });
    const editedElsewhere = manual({ amountMinor: 5000 });

    const plan = planSync({
      local: [editedHere],
      remote: [remote(editedElsewhere, 9)],
      ledger: synced(lunch, 4),
      now,
    });

    expect(plan.saveLocally).toEqual([]);
    expect(plan.push).toEqual([{ ...changeFromRecord(editedHere), revision: now, deleted: false }]);
  });

  test('adopts a matching cloud copy after the ledger was lost instead of pushing it again', () => {
    const lunch = manual();

    const plan = planSync({ local: [lunch], remote: [remote(lunch, 9)], ledger: {}, now });

    expect(plan.push).toEqual([]);
    expect(plan.ledger[lunch.id]).toEqual({ revision: 9, fingerprint: fingerprint(lunch) });
  });

  test('takes the cloud copy when this device has no history of the transaction', () => {
    const stale = manual({ amountMinor: 1000 });
    const current = manual({ amountMinor: 2000 });

    const plan = planSync({ local: [stale], remote: [remote(current, 9)], ledger: {}, now });

    expect(plan.push).toEqual([]);
    expect(plan.saveLocally).toEqual([current]);
  });

  test('does not bring back a transaction removed elsewhere when this device has no history', () => {
    const lunch = manual();

    const plan = planSync({ local: [lunch], remote: [remote(lunch, 9, true)], ledger: {}, now });

    expect(plan.push).toEqual([]);
    expect(plan.removeLocally).toEqual([lunch.id]);
  });

  test('settles on the cloud copy when another device won a push with the same revision', () => {
    const mine = manual({ amountMinor: 4000 });
    const theirs = manual({ amountMinor: 5000 });

    const plan = planSync({
      local: [mine],
      remote: [remote(theirs, 9)],
      ledger: synced(mine, 9),
      now,
    });

    expect(plan.push).toEqual([]);
    expect(plan.saveLocally).toEqual([theirs]);
  });

  test('forgets a removal once the cloud has let its tombstone go', () => {
    const plan = planSync({
      local: [],
      remote: [],
      ledger: { 'manual-lunch': { revision: 4, fingerprint: null } },
      now,
    });

    expect(plan.ledger).toEqual({});
    expect(plan.pulledLedger).toEqual({});
  });

  test('forgets a removal the cloud never received', () => {
    const lunch = manual();

    const plan = planSync({ local: [], remote: [], ledger: synced(lunch, 4), now });

    expect(plan.push).toEqual([]);
    expect(plan.ledger).toEqual({});
  });

  test('sends only the fields a transaction actually has', () => {
    const change = changeFromRecord(manual({ merchant: undefined, category: undefined }));

    expect(Object.keys(change)).not.toContain('merchant');
    expect(Object.keys(change)).not.toContain('category');
  });
});
