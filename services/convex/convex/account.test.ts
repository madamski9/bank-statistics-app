import { describe, expect, test } from 'bun:test';
import { convexTest } from 'convex-test';
import { ConvexError } from 'convex/values';

import { api, internal } from './_generated/api';
import { isIdentityCheckRequired } from './owner';
import schema from './schema';

const moduleFiles = new Bun.Glob('**/*.{ts,js}').scanSync({ cwd: import.meta.dir });
const modules = Object.fromEntries(
  [...moduleFiles]
    .filter((path) => !path.endsWith('.test.ts'))
    .map((path) => [`./${path}`, () => import(`./${path}`)]),
);

const alice = { subject: 'user_alice', issuer: 'https://clerk.test', sid: 'sess_alice_phone', fva: [1, -1] };
const bob = { subject: 'user_bob', issuer: 'https://clerk.test', sid: 'sess_bob_phone' };

function lunch(clientId = 'manual-lunch') {
  return {
    clientId,
    bank: 'manual',
    origin: 'manual' as const,
    direction: 'expense' as const,
    amountMinor: 3450,
    currency: 'PLN',
    accountId: 'general-manual',
    occurredAt: '2026-09-20T12:30:00.000Z',
    capturedAt: '2026-09-20T12:31:00.000Z',
    status: 'posted' as const,
    revision: 1,
    deleted: false,
  };
}

const savings = {
  clientId: 'account-savings',
  bank: 'millennium',
  name: 'Oszczędnościowe',
  isGeneral: false,
  revision: 1,
  deleted: false,
};

async function withData() {
  const backend = convexTest(schema, modules);
  const user = backend.withIdentity(alice);
  const other = backend.withIdentity(bob);

  for (const [identity, installationId] of [
    [user, 'phone'],
    [other, 'bob-phone'],
  ] as const) {
    await identity.mutation(api.devices.register, { installationId, platform: 'ios' });
    await identity.mutation(api.sync.push, { installationId, changes: { financialAccounts: [savings] } });
    await identity.mutation(api.sync.push, { installationId, changes: { transactions: [lunch()] } });
  }

  return { backend, user, other };
}

async function countOwned(backend: Awaited<ReturnType<typeof withData>>['backend'], ownerId: string) {
  return backend.run(async (ctx) => {
    const transactions = await ctx.db
      .query('transactions')
      .withIndex('by_owner_sequence', (index) => index.eq('ownerId', ownerId))
      .collect();
    const accounts = await ctx.db
      .query('financialAccounts')
      .withIndex('by_owner_sequence', (index) => index.eq('ownerId', ownerId))
      .collect();
    const devices = await ctx.db
      .query('devices')
      .withIndex('by_owner_revoked', (index) => index.eq('ownerId', ownerId))
      .collect();

    return transactions.length + accounts.length + devices.length;
  });
}

describe('account deletion', () => {
  test('deletes every synchronized row of the user and nobody else', async () => {
    const { backend, user } = await withData();

    expect(await user.mutation(api.account.deleteData, {})).toEqual({ isComplete: true });
    expect(await countOwned(backend, 'user_alice')).toBe(0);
    expect(await countOwned(backend, 'user_bob')).toBe(3);
  });

  test('can be retried safely after it completed', async () => {
    const { backend, user } = await withData();

    await user.mutation(api.account.deleteData, {});
    expect(await user.mutation(api.account.deleteData, {})).toEqual({ isComplete: true });

    const owners = await backend.run((ctx) => ctx.db.query('owners').collect());
    expect(owners.filter((owner) => owner.deletionRequestedAt !== undefined)).toHaveLength(1);
  });

  test('stops other devices from uploading their copies back', async () => {
    const { user } = await withData();

    await user.mutation(api.account.deleteData, {});

    expect(await user.query(api.devices.standing, { installationId: 'phone' })).toBe('accountDeleted');
    await expect(
      user.mutation(api.devices.register, { installationId: 'phone', platform: 'ios' }),
    ).rejects.toThrow('being deleted');
    await expect(
      user.mutation(api.sync.push, { installationId: 'phone', changes: { transactions: [lunch('late')] } }),
    ).rejects.toThrow('Register');
  });

  test('deletes a large history over several retries', async () => {
    const { backend, user } = await withData();
    await backend.run(async (ctx) => {
      for (let index = 0; index < 1_200; index += 1) {
        await ctx.db.insert('transactions', {
          ...lunch(`bulk-${index}`),
          deleted: false,
          ownerId: 'user_alice',
          sequence: 100 + index,
        });
      }
    });

    let rounds = 0;
    let result = { isComplete: false };

    while (!result.isComplete) {
      result = await user.mutation(api.account.deleteData, {});
      rounds += 1;
    }

    expect(rounds).toBeGreaterThan(1);
    expect(await countOwned(backend, 'user_alice')).toBe(0);
  });

  test('refuses an anonymous caller', async () => {
    const backend = convexTest(schema, modules);

    await expect(backend.mutation(api.account.deleteData, {})).rejects.toThrow('Sign in');
  });

  test('asks for a fresh identity check before it starts', async () => {
    const { backend } = await withData();

    for (const fva of [[30, -1], [-1, -1], undefined]) {
      const stale = backend.withIdentity({ ...alice, fva });

      const refusal = await stale.mutation(api.account.deleteData, {}).catch((error: unknown) => error);

      expect(refusal instanceof ConvexError && isIdentityCheckRequired(refusal.data)).toBe(true);
    }

    expect(await countOwned(backend, 'user_alice')).toBe(3);
  });

  test('continues a started deletion without another identity check', async () => {
    const { backend, user } = await withData();
    await user.mutation(api.account.deleteData, {});

    const later = backend.withIdentity({ ...alice, fva: [90, -1] });

    expect(await later.mutation(api.account.deleteData, {})).toEqual({ isComplete: true });
  });

  test('finishes a large deletion on the server when the app stops asking', async () => {
    const { backend, user } = await withData();
    await backend.run(async (ctx) => {
      for (let index = 0; index < 1_200; index += 1) {
        await ctx.db.insert('transactions', {
          ...lunch(`bulk-${index}`),
          deleted: false,
          ownerId: 'user_alice',
          sequence: 100 + index,
        });
      }
    });

    expect(await user.mutation(api.account.deleteData, {})).toEqual({ isComplete: false });

    for (let round = 0; round < 5; round += 1) {
      await backend.mutation(internal.account.purgeOwner, { ownerId: 'user_alice', removeClerkUser: true });
    }

    expect(await countOwned(backend, 'user_alice')).toBe(0);
    const owner = await backend.run((ctx) =>
      ctx.db
        .query('owners')
        .withIndex('by_owner', (index) => index.eq('ownerId', 'user_alice'))
        .unique(),
    );
    expect(owner?.dataPurgedAt).toBeNumber();
  });

  test('deletes the data of a user removed in Clerk', async () => {
    const { backend } = await withData();

    await backend.mutation(internal.account.forgetDeletedUser, { ownerId: 'user_alice' });
    await backend.mutation(internal.account.purgeOwner, { ownerId: 'user_alice', removeClerkUser: false });

    expect(await countOwned(backend, 'user_alice')).toBe(0);
    expect(await countOwned(backend, 'user_bob')).toBe(3);
  });
});
