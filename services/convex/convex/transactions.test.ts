import { describe, expect, test } from 'bun:test';
import { convexTest } from 'convex-test';

import { api, internal } from './_generated/api';
import schema from './schema';

const moduleFiles = new Bun.Glob('**/*.{ts,js}').scanSync({ cwd: import.meta.dir });
const modules = Object.fromEntries(
  [...moduleFiles]
    .filter((path) => !path.endsWith('.test.ts'))
    .map((path) => [`./${path}`, () => import(`./${path}`)]),
);

const alice = { subject: 'user_alice', issuer: 'https://clerk.test' };
const bob = { subject: 'user_bob', issuer: 'https://clerk.test' };

function lunch(overrides: Record<string, unknown> = {}) {
  return {
    clientId: 'manual-lunch',
    bank: 'manual',
    origin: 'manual' as const,
    direction: 'expense' as const,
    amountMinor: 3450,
    currency: 'PLN',
    merchant: 'Bistro',
    accountId: 'general-manual',
    occurredAt: '2026-09-20T12:30:00.000Z',
    capturedAt: '2026-09-20T12:31:00.000Z',
    status: 'posted' as const,
    revision: 1,
    deleted: false,
    ...overrides,
  };
}

async function signedIn(identity: typeof alice, installationId: string) {
  const backend = convexTest(schema, modules);
  const user = backend.withIdentity(identity);
  await user.mutation(api.devices.register, { installationId, platform: 'ios' });

  return { backend, user };
}

describe('transactions', () => {
  test('refuses every call without a signed-in user', async () => {
    const backend = convexTest(schema, modules);

    await expect(
      backend.mutation(api.devices.register, { installationId: 'phone', platform: 'ios' }),
    ).rejects.toThrow();
    await expect(
      backend.mutation(api.transactions.push, { installationId: 'phone', changes: [lunch()] }),
    ).rejects.toThrow();
    await expect(backend.query(api.transactions.list, { installationId: 'phone' })).rejects.toThrow();
  });

  test('asks an unauthenticated caller to sign in before judging the data', async () => {
    const backend = convexTest(schema, modules);

    await expect(
      backend.mutation(api.transactions.push, {
        installationId: 'phone',
        changes: [lunch({ amountMinor: -1 })],
      }),
    ).rejects.toThrow('Sign in');
  });

  test('reads transactions only through a registered installation', async () => {
    const { user } = await signedIn(alice, 'phone');

    await expect(user.query(api.transactions.list, { installationId: 'stolen' })).rejects.toThrow();
  });

  test('files a transaction only under a general account or an account the user owns', async () => {
    const { backend, user } = await signedIn(alice, 'phone');
    await user.mutation(api.financialAccounts.push, {
      installationId: 'phone',
      changes: [
        {
          clientId: 'account-shared',
          bank: 'manual',
          name: 'Wspólne',
          isGeneral: false,
          revision: 1,
          deleted: false,
        },
      ],
    });

    await user.mutation(api.transactions.push, {
      installationId: 'phone',
      changes: [
        lunch({ clientId: 'manual-a', accountId: 'account-shared' }),
        lunch({ clientId: 'manual-b', accountId: 'general-millennium' }),
      ],
    });
    await expect(
      user.mutation(api.transactions.push, {
        installationId: 'phone',
        changes: [lunch({ accountId: 'account-unknown' })],
      }),
    ).rejects.toThrow();

    const other = backend.withIdentity(bob);
    await other.mutation(api.devices.register, { installationId: 'phone', platform: 'ios' });

    await expect(
      other.mutation(api.transactions.push, {
        installationId: 'phone',
        changes: [lunch({ accountId: 'account-shared' })],
      }),
    ).rejects.toThrow();
  });

  test('refuses a push from an installation the user never registered', async () => {
    const { user } = await signedIn(alice, 'phone');

    await expect(
      user.mutation(api.transactions.push, { installationId: 'tablet', changes: [lunch()] }),
    ).rejects.toThrow();
  });

  test('reads a pushed transaction back on another registered device of the same user', async () => {
    const { backend, user } = await signedIn(alice, 'phone');
    await user.mutation(api.transactions.push, { installationId: 'phone', changes: [lunch()] });

    const tablet = backend.withIdentity(alice);
    await tablet.mutation(api.devices.register, { installationId: 'tablet', platform: 'ios' });
    const listed = await tablet.query(api.transactions.list, { installationId: 'tablet' });

    expect(listed).toHaveLength(1);
    expect(listed[0]).toMatchObject({ clientId: 'manual-lunch', amountMinor: 3450, revision: 1 });
  });

  test('applies the same push twice as one transaction', async () => {
    const { user } = await signedIn(alice, 'phone');
    await user.mutation(api.transactions.push, { installationId: 'phone', changes: [lunch()] });
    await user.mutation(api.transactions.push, { installationId: 'phone', changes: [lunch()] });

    expect(await user.query(api.transactions.list, { installationId: 'phone' })).toHaveLength(1);
  });

  test('keeps the newest revision and ignores an older one arriving late', async () => {
    const { user } = await signedIn(alice, 'phone');
    await user.mutation(api.transactions.push, {
      installationId: 'phone',
      changes: [lunch({ revision: 5, amountMinor: 5000 })],
    });
    await user.mutation(api.transactions.push, {
      installationId: 'phone',
      changes: [lunch({ revision: 3, amountMinor: 3000 })],
    });

    const [stored] = await user.query(api.transactions.list, { installationId: 'phone' });

    expect(stored).toMatchObject({ amountMinor: 5000, revision: 5 });
  });

  test('keeps a removal as a tombstone so other devices can remove it too', async () => {
    const { user } = await signedIn(alice, 'phone');
    await user.mutation(api.transactions.push, { installationId: 'phone', changes: [lunch()] });
    await user.mutation(api.transactions.push, {
      installationId: 'phone',
      changes: [lunch({ revision: 2, deleted: true })],
    });

    const [stored] = await user.query(api.transactions.list, { installationId: 'phone' });

    expect(stored).toMatchObject({ clientId: 'manual-lunch', deleted: true, revision: 2 });
  });

  test('never shows one user the transactions of another', async () => {
    const { backend, user } = await signedIn(alice, 'phone');
    await user.mutation(api.transactions.push, { installationId: 'phone', changes: [lunch()] });

    const other = backend.withIdentity(bob);
    await other.mutation(api.devices.register, { installationId: 'phone', platform: 'ios' });

    expect(await other.query(api.transactions.list, { installationId: 'phone' })).toEqual([]);
  });

  test('never lets one user overwrite or remove the transaction of another', async () => {
    const { backend, user } = await signedIn(alice, 'phone');
    await user.mutation(api.transactions.push, { installationId: 'phone', changes: [lunch()] });

    const other = backend.withIdentity(bob);
    await other.mutation(api.devices.register, { installationId: 'phone', platform: 'ios' });
    await other.mutation(api.transactions.push, {
      installationId: 'phone',
      changes: [lunch({ revision: 9, amountMinor: 1, deleted: true })],
    });

    const [aliceCopy] = await user.query(api.transactions.list, { installationId: 'phone' });
    const [bobCopy] = await other.query(api.transactions.list, { installationId: 'phone' });

    expect(aliceCopy).toMatchObject({ amountMinor: 3450, revision: 1, deleted: false });
    expect(bobCopy).toMatchObject({ amountMinor: 1, revision: 9, deleted: true });
  });

  test('rejects amounts that are not positive whole minor units', async () => {
    const { user } = await signedIn(alice, 'phone');

    for (const amountMinor of [0, -100, 12.5]) {
      await expect(
        user.mutation(api.transactions.push, {
          installationId: 'phone',
          changes: [lunch({ amountMinor })],
        }),
      ).rejects.toThrow();
    }
  });

  test('rejects a currency that is not an ISO code and an unreadable occurrence time', async () => {
    const { user } = await signedIn(alice, 'phone');

    await expect(
      user.mutation(api.transactions.push, {
        installationId: 'phone',
        changes: [lunch({ currency: 'zł' })],
      }),
    ).rejects.toThrow();
    await expect(
      user.mutation(api.transactions.push, {
        installationId: 'phone',
        changes: [lunch({ occurredAt: 'yesterday' })],
      }),
    ).rejects.toThrow();
  });

  test('rejects a captured transaction and an unreadable capture time', async () => {
    const { user } = await signedIn(alice, 'phone');

    await expect(
      user.mutation(api.transactions.push, {
        installationId: 'phone',
        changes: [lunch({ origin: 'capture' })],
      }),
    ).rejects.toThrow();
    await expect(
      user.mutation(api.transactions.push, {
        installationId: 'phone',
        changes: [lunch({ capturedAt: 'soon' })],
      }),
    ).rejects.toThrow();
  });

  test('rejects a manual transaction without a Financial Account', async () => {
    const { user } = await signedIn(alice, 'phone');

    await expect(
      user.mutation(api.transactions.push, {
        installationId: 'phone',
        changes: [lunch({ accountId: undefined })],
      }),
    ).rejects.toThrow();
    await expect(
      user.mutation(api.transactions.push, {
        installationId: 'phone',
        changes: [lunch({ accountId: ' ' })],
      }),
    ).rejects.toThrow();
  });

  test('forgets a tombstone 90 days after the removal and keeps younger ones', async () => {
    const { backend, user } = await signedIn(alice, 'phone');
    await user.mutation(api.transactions.push, {
      installationId: 'phone',
      changes: [
        lunch({ clientId: 'manual-old', deleted: true }),
        lunch({ clientId: 'manual-recent', deleted: true }),
        lunch({ clientId: 'manual-kept' }),
      ],
    });
    const dayMs = 24 * 60 * 60 * 1000;
    await backend.run(async (ctx) => {
      const old = await ctx.db
        .query('transactions')
        .filter((row) => row.eq(row.field('clientId'), 'manual-old'))
        .unique();
      await ctx.db.patch(old!._id, { deletedAt: Date.now() - 91 * dayMs });
    });

    await backend.mutation(internal.syncedRows.purgeExpiredTombstones, {});
    const remaining = await user.query(api.transactions.list, { installationId: 'phone' });

    expect(remaining.map((row) => row.clientId).sort()).toEqual(['manual-kept', 'manual-recent']);
  });
});
