import { afterEach, describe, expect, test } from 'bun:test';
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

const alice = { subject: 'user_alice', issuer: 'https://clerk.test', sid: 'sess_alice_phone' };
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

const originalFetch = globalThis.fetch;
const originalEnvironment = { ...process.env };

afterEach(() => {
  globalThis.fetch = originalFetch;
  process.env = { ...originalEnvironment };
});

function revenueCatAnswering(statuses: number[], calls: { url: string; method: string; authorization: string | null }[]) {
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({
      url: String(input),
      method: init?.method ?? 'GET',
      authorization: new Headers(init?.headers).get('Authorization'),
    });

    return new Response('{}', { status: statuses.shift() ?? 200 });
  }) as typeof fetch;
}

async function pendingJobs(backend: Awaited<ReturnType<typeof withData>>['backend'], name: string) {
  return backend.run(async (ctx) =>
    (await ctx.db.system.query('_scheduled_functions').collect()).filter(
      (job) => job.state.kind === 'pending' && job.name.includes(name),
    ),
  );
}

describe('account deletion', () => {
  test('deletes every synchronized row of the user and nobody else', async () => {
    const { backend, user } = await withData();

    expect(await user.mutation(internal.account.beginDeletion, {})).toEqual({ isComplete: true });
    expect(await countOwned(backend, 'user_alice')).toBe(0);
    expect(await countOwned(backend, 'user_bob')).toBe(3);
  });

  test('can be retried safely after it completed', async () => {
    const { backend, user } = await withData();

    await user.mutation(internal.account.beginDeletion, {});
    expect(await user.mutation(api.account.deleteData, {})).toEqual({ isComplete: true });

    const owners = await backend.run((ctx) => ctx.db.query('owners').collect());
    expect(owners.filter((owner) => owner.deletionRequestedAt !== undefined)).toHaveLength(1);
  });

  test('stops other devices from uploading their copies back', async () => {
    const { user } = await withData();

    await user.mutation(internal.account.beginDeletion, {});

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

    let result = await user.mutation(internal.account.beginDeletion, {});
    let rounds = 1;

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

  test('refuses to continue a deletion that was never started', async () => {
    const { backend, user } = await withData();

    const refusal = await user.mutation(api.account.deleteData, {}).catch((error: unknown) => error);

    expect(refusal instanceof ConvexError && isIdentityCheckRequired(refusal.data)).toBe(true);
    expect(await countOwned(backend, 'user_alice')).toBe(3);
  });

  test('continues a started deletion without another identity check', async () => {
    const { user } = await withData();
    await user.mutation(internal.account.beginDeletion, {});

    expect(await user.mutation(api.account.deleteData, {})).toEqual({ isComplete: true });
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

    expect(await user.mutation(internal.account.beginDeletion, {})).toEqual({ isComplete: false });

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

  test('removes the RevenueCat customer once the data of the account is gone', async () => {
    const { backend, user } = await withData();

    await user.mutation(internal.account.beginDeletion, {});

    const removals = await pendingJobs(backend, 'removeRevenueCatCustomer');
    expect(removals.map((job) => job.args[0])).toEqual([{ ownerId: 'user_alice', attempt: 1 }]);
  });

  test('also removes the RevenueCat customer of a user deleted in Clerk', async () => {
    const { backend } = await withData();

    await backend.mutation(internal.account.forgetDeletedUser, { ownerId: 'user_alice' });
    await backend.mutation(internal.account.purgeOwner, { ownerId: 'user_alice', removeClerkUser: false });

    const removals = await pendingJobs(backend, 'removeRevenueCatCustomer');
    expect(removals.map((job) => job.args[0].ownerId)).toContain('user_alice');
  });

  test('deletes the customer in RevenueCat and treats a missing customer as removed', async () => {
    const { backend } = await withData();
    const calls: { url: string; method: string; authorization: string | null }[] = [];
    process.env.REVENUECAT_SECRET_API_KEY = 'sk_test';
    revenueCatAnswering([200, 404], calls);

    await backend.action(internal.account.removeRevenueCatCustomer, { ownerId: 'user_alice', attempt: 1 });
    await backend.action(internal.account.removeRevenueCatCustomer, { ownerId: 'user_alice', attempt: 1 });

    expect(calls).toEqual([
      { url: 'https://api.revenuecat.com/v1/subscribers/user_alice', method: 'DELETE', authorization: 'Bearer sk_test' },
      { url: 'https://api.revenuecat.com/v1/subscribers/user_alice', method: 'DELETE', authorization: 'Bearer sk_test' },
    ]);
    expect(await pendingJobs(backend, 'removeRevenueCatCustomer')).toEqual([]);
  });

  test('tries again later when RevenueCat is unavailable and gives up loudly after the last attempt', async () => {
    const { backend } = await withData();
    process.env.REVENUECAT_SECRET_API_KEY = 'sk_test';
    revenueCatAnswering([503, 503], []);

    await backend.action(internal.account.removeRevenueCatCustomer, { ownerId: 'user_alice', attempt: 1 });

    const retries = await pendingJobs(backend, 'removeRevenueCatCustomer');
    expect(retries.map((job) => job.args[0])).toEqual([{ ownerId: 'user_alice', attempt: 2 }]);
    await expect(
      backend.action(internal.account.removeRevenueCatCustomer, { ownerId: 'user_alice', attempt: 6 }),
    ).rejects.toThrow('503');
  });
});

