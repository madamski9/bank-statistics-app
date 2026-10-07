import { describe, expect, test } from 'bun:test';
import { defineSchema } from 'convex/server';
import { convexTest } from 'convex-test';

import { api, internal } from './_generated/api';
import schema from './schema';

const moduleFiles = new Bun.Glob('**/*.{ts,js}').scanSync({ cwd: import.meta.dir });
const modules = Object.fromEntries(
  [...moduleFiles]
    .filter((path) => !path.endsWith('.test.ts'))
    .map((path) => [`./${path}`, () => import(`./${path}`)]),
);

const legacySchema = defineSchema(schema.tables, { schemaValidation: false });
const alice = { subject: 'user_alice', issuer: 'https://clerk.test', sid: 'sess_alice_phone' };

function legacyLunch(clientId: string, overrides: Record<string, unknown> = {}) {
  return {
    clientId,
    bank: 'manual',
    origin: 'manual',
    direction: 'expense',
    amountMinor: 3450,
    currency: 'PLN',
    merchant: 'Bistro',
    accountId: 'general-manual',
    occurredAt: '2026-09-20T12:30:00.000Z',
    capturedAt: '2026-09-20T12:31:00.000Z',
    status: 'posted',
    ownerId: 'user_alice',
    revision: 1,
    deleted: false,
    lastDeviceId: 'device-legacy',
    ...overrides,
  };
}

async function migrated() {
  const backend = convexTest(legacySchema, modules);
  await backend.run(async (ctx) => {
    const db = ctx.db as unknown as { insert: (table: string, document: object) => Promise<string> };
    await db.insert('devices', {
      ownerId: 'user_alice',
      installationId: 'phone',
      platform: 'ios',
      registeredAt: 1,
      lastSeenAt: 1,
    });

    for (let index = 0; index < 150; index += 1) {
      await db.insert('transactions', legacyLunch(`manual-${index}`));
    }

    await db.insert('transactions', legacyLunch('manual-removed', { deleted: true, deletedAt: 5 }));
    await db.insert('accountDeletions', { ownerId: 'user_gone', requestedAt: 7 });
  });

  await backend.mutation(internal.migrations.migrateToIncrementalSync, {});
  await backend.finishAllScheduledFunctions(() => undefined);

  return backend;
}

describe('migration to incremental sync', () => {
  test('keeps every transaction and gives each a sequence', async () => {
    const backend = await migrated();
    const rows = await backend.run((ctx) => ctx.db.query('transactions').collect());

    expect(rows).toHaveLength(151);
    expect(new Set(rows.map((row) => row.sequence)).size).toBe(151);
    expect(rows.every((row) => !('lastDeviceId' in row))).toBe(true);
    expect(rows.find((row) => row.clientId === 'manual-7')).toMatchObject({ merchant: 'Bistro', deleted: false });
  });

  test('strips the content of a tombstone', async () => {
    const backend = await migrated();
    const removed = await backend.run((ctx) =>
      ctx.db
        .query('transactions')
        .withIndex('by_owner_client', (index) => index.eq('ownerId', 'user_alice').eq('clientId', 'manual-removed'))
        .unique(),
    );

    expect(removed).not.toHaveProperty('merchant');
    expect(removed).toMatchObject({ deleted: true, deletedAt: 5, revision: 1 });
  });

  test('moves account deletion markers to the owner', async () => {
    const backend = await migrated();
    const owners = await backend.run((ctx) => ctx.db.query('owners').collect());

    expect(owners.find((owner) => owner.ownerId === 'user_gone')?.deletionRequestedAt).toBe(7);
    expect(owners.find((owner) => owner.ownerId === 'user_alice')?.sequence).toBe(151);
  });

  test('lets an existing device register again and pull the whole history', async () => {
    const backend = await migrated();
    const user = backend.withIdentity(alice);

    await user.mutation(api.devices.register, { installationId: 'phone', platform: 'ios' });
    const page = await user.query(api.sync.pull, {
      installationId: 'phone',
      cursors: { transactions: 0, financialAccounts: 0, categories: 0, events: 0 },
    });

    expect(page.changes.transactions).toHaveLength(151);
  });

  test('can run again without changing anything', async () => {
    const backend = await migrated();
    const before = await backend.run((ctx) => ctx.db.query('transactions').collect());

    await backend.mutation(internal.migrations.migrateToIncrementalSync, {});
    await backend.finishAllScheduledFunctions(() => undefined);
    const after = await backend.run((ctx) => ctx.db.query('transactions').collect());

    expect(after).toEqual(before);
  });
});
