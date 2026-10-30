import { describe, expect, test } from 'bun:test';

import { countByOwner, migrateSnapshot, type Snapshot } from './beta-snapshot';

const now = 1_800_000_000_000;
const ownerIds = new Map([
  ['user_alice_beta', 'user_alice_live'],
  ['user_bob_beta', 'user_bob_live'],
]);

function beta(): Snapshot {
  return {
    transactions: [
      { _id: 't1', ownerId: 'user_alice_beta', clientId: 'lunch', revision: 3, sequence: 7, deleted: false },
      { _id: 't2', ownerId: 'user_alice_beta', clientId: 'gone', revision: 1, sequence: 8, deleted: true, deletedAt: 5 },
      { _id: 't3', ownerId: 'user_carol_beta', clientId: 'coffee', revision: 1, sequence: 1, deleted: false },
    ],
    devices: [{ _id: 'd1', ownerId: 'user_alice_beta', installationId: 'phone', sessionId: 'sess_beta', revokedAt: 4 }],
    owners: [{ _id: 'o1', ownerId: 'user_alice_beta', sequence: 8, pushAllowance: 10, pushAllowanceAt: 1 }],
    profiles: [
      {
        _id: 'p1',
        _creationTime: 2,
        ownerId: 'user_alice_beta',
        isPremium: false,
        storeSubscription: { isActive: true, willRenew: true },
        storeSubscriptionRecheck: 'scheduled_1',
        premiumUntil: 9,
      },
      { _id: 'p2', ownerId: 'user_bob_beta', isPremium: true, premiumSince: 6 },
    ],
    premiumCodes: [{ _id: 'c1', code: 'GIFT', createdAt: 1 }],
  };
}

describe('moving the beta snapshot to production accounts', () => {
  test('moves every row to the production account and keeps its sync position', () => {
    const { snapshot } = migrateSnapshot(beta(), ownerIds, now);

    expect(snapshot.transactions).toEqual([
      { _id: 't1', ownerId: 'user_alice_live', clientId: 'lunch', revision: 3, sequence: 7, deleted: false },
      { _id: 't2', ownerId: 'user_alice_live', clientId: 'gone', revision: 1, sequence: 8, deleted: true, deletedAt: 5 },
    ]);
    expect(snapshot.devices).toEqual([
      { _id: 'd1', ownerId: 'user_alice_live', installationId: 'phone', sessionId: 'sess_beta', revokedAt: 4 },
    ]);
  });

  test('remembers the beta account on every production owner, also for testers who never synced', () => {
    const { snapshot } = migrateSnapshot(beta(), ownerIds, now);

    expect(snapshot.owners).toEqual([
      {
        _id: 'o1',
        ownerId: 'user_alice_live',
        legacyOwnerId: 'user_alice_beta',
        sequence: 8,
        pushAllowance: 10,
        pushAllowanceAt: 1,
      },
      expect.objectContaining({ ownerId: 'user_bob_live', legacyOwnerId: 'user_bob_beta', sequence: 0 }),
    ]);
    expect(snapshot.owners?.[1]).not.toHaveProperty('_id');
  });

  test('turns any beta Premium into lifetime Premium without the sandbox subscription', () => {
    const { snapshot } = migrateSnapshot(beta(), ownerIds, now);

    expect(snapshot.profiles).toEqual([
      { _id: 'p1', _creationTime: 2, ownerId: 'user_alice_live', isPremium: true, premiumSince: 2 },
      { _id: 'p2', ownerId: 'user_bob_live', isPremium: true, premiumSince: 6 },
    ]);
  });

  test('leaves behind testers without a production account and reports them', () => {
    const { snapshot, leftBehind } = migrateSnapshot(beta(), ownerIds, now);

    expect(leftBehind).toEqual(['user_carol_beta']);
    expect(countByOwner(snapshot).user_carol_beta).toBeUndefined();
  });

  test('copies shared tables unchanged', () => {
    const { snapshot } = migrateSnapshot(beta(), ownerIds, now);

    expect(snapshot.premiumCodes).toEqual([{ _id: 'c1', code: 'GIFT', createdAt: 1 }]);
    expect(snapshot.exchangeRates).toEqual([]);
  });

  test('refuses a snapshot with a table it does not know how to move', () => {
    expect(() => migrateSnapshot({ ...beta(), notes: [] }, ownerIds, now)).toThrow('Unknown tables in the snapshot: notes');
  });

  test('counts rows per owner so both sides can be compared', () => {
    const { snapshot } = migrateSnapshot(beta(), ownerIds, now);

    expect(countByOwner(beta()).user_alice_beta).toEqual(countByOwner(snapshot).user_alice_live!);
    expect(countByOwner(snapshot).user_alice_live).toEqual({
      transactions: 1,
      'transactions (deleted)': 1,
      devices: 1,
      owners: 1,
      profiles: 1,
    });
  });
});
