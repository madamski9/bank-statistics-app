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

const alice = { subject: 'user_alice', issuer: 'https://clerk.test', sid: 'sess_alice_phone' };
const bob = { subject: 'user_bob', issuer: 'https://clerk.test', sid: 'sess_bob_phone' };

const emptyCursors = { transactions: 0, financialAccounts: 0, categories: 0, events: 0 };

async function pulled<Table extends keyof typeof emptyCursors>(
  caller: Pick<ReturnType<typeof convexTest>, 'query'>,
  installationId: string,
  table: Table,
) {
  const page = await caller.query(api.sync.pull, { installationId, cursors: emptyCursors });

  return page.changes[table];
}

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

describe('sync', () => {
  test('preserves a user-assigned bank name and validates its length', async () => {
    const { user } = await signedIn(alice, 'phone');
    const transaction = lunch({
      clientId: 'trade-republic', bank: 'unknown', origin: 'capture', accountId: undefined,
      sourceApp: 'com.apple.Passbook', bankName: 'Trade Republic',
    });
    await user.mutation(api.sync.push, { installationId: 'phone', changes: { transactions: [transaction] } });
    expect(await pulled(user, 'phone', 'transactions')).toEqual([
      expect.objectContaining({ bank: 'unknown', bankName: 'Trade Republic' }),
    ]);
    for (const bankName of ['', 'x'.repeat(61)]) {
      await expect(user.mutation(api.sync.push, {
        installationId: 'phone', changes: { transactions: [{ ...transaction, bankName, revision: 2 }] },
      })).rejects.toThrow('bank name');
    }
  });
  test('refuses every call without a signed-in user', async () => {
    const backend = convexTest(schema, modules);

    await expect(
      backend.mutation(api.devices.register, { installationId: 'phone', platform: 'ios' }),
    ).rejects.toThrow();
    await expect(
      backend.mutation(api.sync.push, { installationId: 'phone', changes: { transactions: [lunch()] } }),
    ).rejects.toThrow();
    await expect(pulled(backend, 'phone', 'transactions')).rejects.toThrow();
  });

  test('asks an unauthenticated caller to sign in before judging the data', async () => {
    const backend = convexTest(schema, modules);

    await expect(
      backend.mutation(api.sync.push, {
        installationId: 'phone',
        changes: { transactions: [lunch({ amountMinor: -1 })] },
      }),
    ).rejects.toThrow('Sign in');
  });

  test('reads transactions only through a registered installation', async () => {
    const { user } = await signedIn(alice, 'phone');

    await expect(pulled(user, 'stolen', 'transactions')).rejects.toThrow();
  });

  test('files a transaction only under a general account or an account the user owns', async () => {
    const { backend, user } = await signedIn(alice, 'phone');
    await user.mutation(api.sync.push, {
      installationId: 'phone',
      changes: { financialAccounts: [
        {
          clientId: 'account-shared',
          bank: 'manual',
          name: 'Wspólne',
          isGeneral: false,
          revision: 1,
          deleted: false,
        },
      ] },
    });

    await user.mutation(api.sync.push, {
      installationId: 'phone',
      changes: { transactions: [
        lunch({ clientId: 'manual-a', accountId: 'account-shared' }),
        lunch({ clientId: 'manual-b', accountId: 'general-millennium' }),
      ] },
    });
    await expect(
      user.mutation(api.sync.push, {
        installationId: 'phone',
        changes: { transactions: [lunch({ accountId: 'account-unknown' })] },
      }),
    ).rejects.toThrow();

    const other = backend.withIdentity(bob);
    await other.mutation(api.devices.register, { installationId: 'phone', platform: 'ios' });

    await expect(
      other.mutation(api.sync.push, {
        installationId: 'phone',
        changes: { transactions: [lunch({ accountId: 'account-shared' })] },
      }),
    ).rejects.toThrow();
  });

  test('refuses a push from an installation the user never registered', async () => {
    const { user } = await signedIn(alice, 'phone');

    await expect(
      user.mutation(api.sync.push, { installationId: 'tablet', changes: { transactions: [lunch()] } }),
    ).rejects.toThrow();
  });

  test('reads a pushed transaction back on another registered device of the same user', async () => {
    const { backend, user } = await signedIn(alice, 'phone');
    await user.mutation(api.sync.push, { installationId: 'phone', changes: { transactions: [lunch()] } });

    const tablet = backend.withIdentity({ ...alice, sid: 'sess_alice_tablet' });
    await tablet.mutation(api.devices.register, { installationId: 'tablet', platform: 'ios' });
    const listed = await pulled(tablet, 'tablet', 'transactions');

    expect(listed).toHaveLength(1);
    expect(listed[0]).toMatchObject({ clientId: 'manual-lunch', amountMinor: 3450, revision: 1 });
  });

  test('applies the same push twice as one transaction', async () => {
    const { user } = await signedIn(alice, 'phone');
    await user.mutation(api.sync.push, { installationId: 'phone', changes: { transactions: [lunch()] } });
    await user.mutation(api.sync.push, { installationId: 'phone', changes: { transactions: [lunch()] } });

    expect(await pulled(user, 'phone', 'transactions')).toHaveLength(1);
  });

  test('keeps the newest revision and ignores an older one arriving late', async () => {
    const { user } = await signedIn(alice, 'phone');
    await user.mutation(api.sync.push, {
      installationId: 'phone',
      changes: { transactions: [lunch({ revision: 5, amountMinor: 5000 })] },
    });
    await user.mutation(api.sync.push, {
      installationId: 'phone',
      changes: { transactions: [lunch({ revision: 3, amountMinor: 3000 })] },
    });

    const [stored] = await pulled(user, 'phone', 'transactions');

    expect(stored).toMatchObject({ amountMinor: 5000, revision: 5 });
  });

  test('keeps a removal as a tombstone so other devices can remove it too', async () => {
    const { user } = await signedIn(alice, 'phone');
    await user.mutation(api.sync.push, { installationId: 'phone', changes: { transactions: [lunch()] } });
    await user.mutation(api.sync.push, {
      installationId: 'phone',
      changes: { transactions: [lunch({ revision: 2, deleted: true })] },
    });

    const [stored] = await pulled(user, 'phone', 'transactions');

    expect(stored).toMatchObject({ clientId: 'manual-lunch', deleted: true, revision: 2 });
  });

  test('never shows one user the transactions of another', async () => {
    const { backend, user } = await signedIn(alice, 'phone');
    await user.mutation(api.sync.push, { installationId: 'phone', changes: { transactions: [lunch()] } });

    const other = backend.withIdentity(bob);
    await other.mutation(api.devices.register, { installationId: 'phone', platform: 'ios' });

    expect(await pulled(other, 'phone', 'transactions')).toEqual([]);
  });

  test('never lets one user overwrite or remove the transaction of another', async () => {
    const { backend, user } = await signedIn(alice, 'phone');
    await user.mutation(api.sync.push, { installationId: 'phone', changes: { transactions: [lunch()] } });

    const other = backend.withIdentity(bob);
    await other.mutation(api.devices.register, { installationId: 'phone', platform: 'ios' });
    await other.mutation(api.sync.push, {
      installationId: 'phone',
      changes: { transactions: [lunch({ revision: 9, amountMinor: 1, deleted: true })] },
    });

    const [aliceCopy] = await pulled(user, 'phone', 'transactions');
    const [bobCopy] = await pulled(other, 'phone', 'transactions');

    expect(aliceCopy).toMatchObject({ amountMinor: 3450, revision: 1, deleted: false });
    expect(bobCopy).toEqual({ clientId: 'manual-lunch', revision: 9, deleted: true });
  });

  test('rejects amounts that are not positive whole minor units', async () => {
    const { user } = await signedIn(alice, 'phone');

    for (const amountMinor of [0, -100, 12.5]) {
      await expect(
        user.mutation(api.sync.push, {
          installationId: 'phone',
          changes: { transactions: [lunch({ amountMinor })] },
        }),
      ).rejects.toThrow();
    }
  });

  test('rejects a currency that is not an ISO code and an unreadable occurrence time', async () => {
    const { user } = await signedIn(alice, 'phone');

    await expect(
      user.mutation(api.sync.push, {
        installationId: 'phone',
        changes: { transactions: [lunch({ currency: 'zł' })] },
      }),
    ).rejects.toThrow();
    await expect(
      user.mutation(api.sync.push, {
        installationId: 'phone',
        changes: { transactions: [lunch({ occurredAt: 'yesterday' })] },
      }),
    ).rejects.toThrow();
  });

  test('rejects a loosely parsed date that is not an ISO 8601 timestamp', async () => {
    const { user } = await signedIn(alice, 'phone');

    for (const occurredAt of ['1', 'Sep 20 2026', '2026-09-20']) {
      await expect(
        user.mutation(api.sync.push, {
          installationId: 'phone',
          changes: { transactions: [lunch({ occurredAt })] },
        }),
      ).rejects.toThrow('ISO 8601');
    }
  });

  test('refuses an account id that only looks like a general account', async () => {
    const { user } = await signedIn(alice, 'phone');

    await expect(
      user.mutation(api.sync.push, {
        installationId: 'phone',
        changes: { transactions: [lunch({ accountId: 'general-someone-else' })] },
      }),
    ).rejects.toThrow('Financial Accounts');
    await user.mutation(api.sync.push, {
      installationId: 'phone',
      changes: { transactions: [lunch({ accountId: 'general-millennium' })] },
    });
  });

  test('refuses oversized text fields and oversized pushes', async () => {
    const { user } = await signedIn(alice, 'phone');

    await expect(
      user.mutation(api.sync.push, {
        installationId: 'phone',
        changes: { transactions: [lunch({ merchant: 'x'.repeat(201) })] },
      }),
    ).rejects.toThrow('at most');
    await expect(
      user.mutation(api.sync.push, {
        installationId: 'phone',
        changes: { transactions: Array.from({ length: 501 }, (_, index) => lunch({ clientId: `manual-${index}` })) },
      }),
    ).rejects.toThrow('at most');
    await expect(
      user.mutation(api.devices.register, { installationId: 'x'.repeat(201), platform: 'ios' }),
    ).rejects.toThrow('at most');
  });

  test('accepts a captured Millennium transaction with no Financial Account', async () => {
    const { user } = await signedIn(alice, 'phone');

    await user.mutation(api.sync.push, {
      installationId: 'phone',
      changes: { transactions: [lunch({
        clientId: 'capture-wallet',
        bank: 'millennium',
        origin: 'capture',
        accountId: undefined,
        sourceApp: 'com.apple.Passbook',
        review: 'currency',
      })] },
    });

    expect(await pulled(user, 'phone', 'transactions')).toEqual([
      expect.objectContaining({
        clientId: 'capture-wallet',
        origin: 'capture',
        sourceApp: 'com.apple.Passbook',
        review: 'currency',
      }),
    ]);
  });

  test('accepts an unknown captured bank and preserves it through synchronization', async () => {
    const { user } = await signedIn(alice, 'phone');

    await user.mutation(api.sync.push, {
      installationId: 'phone',
      changes: { transactions: [lunch({
        clientId: 'capture-zen',
        bank: 'unknown',
        origin: 'capture',
        transactionType: 'cardPayment',
        accountId: undefined,
        sourceApp: 'com.apple.Passbook',
      })] },
    });

    expect(await pulled(user, 'phone', 'transactions')).toEqual([
      expect.objectContaining({
        clientId: 'capture-zen',
        bank: 'unknown',
        origin: 'capture',
        sourceApp: 'com.apple.Passbook',
      }),
    ]);
  });

  test('accepts a captured PKO BP transfer with no Financial Account', async () => {
    const { user } = await signedIn(alice, 'phone');

    await user.mutation(api.sync.push, {
      installationId: 'phone',
      changes: { transactions: [lunch({
        clientId: 'capture-pko',
        bank: 'pko',
        origin: 'capture',
        direction: 'income',
        transactionType: 'incomingTransfer',
        accountId: undefined,
        sourceApp: 'pl.pkobp.iko',
      })] },
    });

    expect(await pulled(user, 'phone', 'transactions')).toEqual([
      expect.objectContaining({ clientId: 'capture-pko', bank: 'pko', direction: 'income' }),
    ]);
  });

  test('synchronizes mBank transfers, accounts and manual entries assigned to mBank', async () => {
    const { user } = await signedIn(alice, 'phone');

    await user.mutation(api.sync.push, {
      installationId: 'phone',
      changes: {
        financialAccounts: [{
          clientId: 'general-mbank',
          bank: 'mbank',
          name: 'mBank',
          isGeneral: true,
          revision: 1,
          deleted: false,
        }],
        transactions: [
          lunch({
            clientId: 'capture-mbank',
            bank: 'mbank',
            origin: 'capture',
            direction: 'income',
            transactionType: 'incomingTransfer',
            accountId: undefined,
            sourceApp: 'pl.mbank',
          }),
          lunch({ clientId: 'manual-mbank', accountId: 'general-mbank' }),
        ],
      },
    });

    expect(await pulled(user, 'phone', 'transactions')).toEqual(expect.arrayContaining([
      expect.objectContaining({ clientId: 'capture-mbank', bank: 'mbank', direction: 'income' }),
      expect.objectContaining({ clientId: 'manual-mbank', accountId: 'general-mbank' }),
    ]));
    expect(await pulled(user, 'phone', 'financialAccounts')).toEqual([
      expect.objectContaining({ clientId: 'general-mbank', bank: 'mbank' }),
    ]);
  });

  test('keeps captured Millennium transactions under the signed-in owner', async () => {
    const { backend, user } = await signedIn(alice, 'phone');
    await user.mutation(api.sync.push, {
      installationId: 'phone',
      changes: { transactions: [lunch({
        clientId: 'capture-wallet',
        bank: 'millennium',
        origin: 'capture',
        accountId: undefined,
      })] },
    });

    const other = backend.withIdentity(bob);
    await other.mutation(api.devices.register, { installationId: 'phone', platform: 'ios' });

    expect(await pulled(other, 'phone', 'transactions')).toEqual([]);
  });

  test('rejects a captured transaction from an unavailable bank and an unreadable capture time', async () => {
    const { user } = await signedIn(alice, 'phone');

    await expect(
      user.mutation(api.sync.push, {
        installationId: 'phone',
        changes: { transactions: [lunch({ origin: 'capture' })] },
      }),
    ).rejects.toThrow();
    await expect(
      user.mutation(api.sync.push, {
        installationId: 'phone',
        changes: { transactions: [lunch({ capturedAt: 'soon' })] },
      }),
    ).rejects.toThrow();
  });

  test('rejects a manual transaction without a Financial Account', async () => {
    const { user } = await signedIn(alice, 'phone');

    await expect(
      user.mutation(api.sync.push, {
        installationId: 'phone',
        changes: { transactions: [lunch({ accountId: undefined })] },
      }),
    ).rejects.toThrow();
    await expect(
      user.mutation(api.sync.push, {
        installationId: 'phone',
        changes: { transactions: [lunch({ accountId: ' ' })] },
      }),
    ).rejects.toThrow();
  });

  test('forgets a tombstone 90 days after the removal and keeps younger ones', async () => {
    const { backend, user } = await signedIn(alice, 'phone');
    await user.mutation(api.sync.push, {
      installationId: 'phone',
      changes: { transactions: [
        lunch({ clientId: 'manual-old', deleted: true }),
        lunch({ clientId: 'manual-recent', deleted: true }),
        lunch({ clientId: 'manual-kept' }),
      ] },
    });
    const dayMs = 24 * 60 * 60 * 1000;
    await backend.run(async (ctx) => {
      const old = await ctx.db
        .query('transactions')
        .filter((row) => row.eq(row.field('clientId'), 'manual-old'))
        .unique();
      await ctx.db.patch(old!._id, { deletedAt: Date.now() - 91 * dayMs });
    });

    await backend.mutation(internal.sync.purgeExpiredTombstones, {});
    const remaining = await pulled(user, 'phone', 'transactions');

    expect(remaining.map((row) => row.clientId).sort()).toEqual(['manual-kept', 'manual-recent']);
  });
});

describe('incremental sync', () => {
  test('keeps no content in a tombstone', async () => {
    const { backend, user } = await signedIn(alice, 'phone');
    await user.mutation(api.sync.push, { installationId: 'phone', changes: { transactions: [lunch()] } });
    await user.mutation(api.sync.push, {
      installationId: 'phone',
      changes: { transactions: [{ clientId: 'manual-lunch', revision: 2, deleted: true }] },
    });

    const [stored] = await backend.run((ctx) => ctx.db.query('transactions').collect());

    expect(stored).not.toHaveProperty('merchant');
    expect(stored).not.toHaveProperty('amountMinor');
    expect(stored).toMatchObject({ clientId: 'manual-lunch', revision: 2, deleted: true });
  });

  test('pulls only what changed after the cursor', async () => {
    const { user } = await signedIn(alice, 'phone');
    await user.mutation(api.sync.push, {
      installationId: 'phone',
      changes: { transactions: [lunch({ clientId: 'manual-a' }), lunch({ clientId: 'manual-b' })] },
    });
    const first = await user.query(api.sync.pull, { installationId: 'phone', cursors: emptyCursors });
    await user.mutation(api.sync.push, {
      installationId: 'phone',
      changes: { transactions: [lunch({ clientId: 'manual-b', revision: 2, amountMinor: 999 })] },
    });

    const second = await user.query(api.sync.pull, { installationId: 'phone', cursors: first.cursors });

    expect(first).toMatchObject({ head: 2, isComplete: true });
    expect(second.changes.transactions).toEqual([
      expect.objectContaining({ clientId: 'manual-b', amountMinor: 999 }),
    ]);
    expect(second.head).toBe(3);
    expect(await user.query(api.sync.head, { installationId: 'phone' })).toBe(3);
  });

  test('pages through a long history', async () => {
    const { user } = await signedIn(alice, 'phone');
    const history = Array.from({ length: 700 }, (_, index) => lunch({ clientId: `manual-${index}` }));
    await user.mutation(api.sync.push, { installationId: 'phone', changes: { transactions: history.slice(0, 500) } });
    await user.mutation(api.sync.push, { installationId: 'phone', changes: { transactions: history.slice(500) } });

    const first = await user.query(api.sync.pull, { installationId: 'phone', cursors: emptyCursors });
    const second = await user.query(api.sync.pull, { installationId: 'phone', cursors: first.cursors });

    expect(first.isComplete).toBe(false);
    expect(first.changes.transactions).toHaveLength(500);
    expect(second.isComplete).toBe(true);
    expect(second.changes.transactions).toHaveLength(200);
  });

  test('reports the sequence range of its own push and skips stale revisions', async () => {
    const { user } = await signedIn(alice, 'phone');

    const first = await user.mutation(api.sync.push, {
      installationId: 'phone',
      changes: { transactions: [lunch({ revision: 5 })] },
    });
    const stale = await user.mutation(api.sync.push, {
      installationId: 'phone',
      changes: { transactions: [lunch({ revision: 4 })] },
    });

    expect(first).toEqual({ sequenceBefore: 0, sequence: 1 });
    expect(stale).toEqual({ sequenceBefore: 1, sequence: 1 });
  });

  test('accepts a transaction together with the account it belongs to in one push', async () => {
    const { user } = await signedIn(alice, 'phone');

    await user.mutation(api.sync.push, {
      installationId: 'phone',
      changes: {
        transactions: [lunch({ accountId: 'account-joint' })],
        financialAccounts: [
          { clientId: 'account-joint', bank: 'manual', name: 'Wspólne', isGeneral: false, revision: 1, deleted: false },
        ],
      },
    });

    expect(await pulled(user, 'phone', 'transactions')).toHaveLength(1);
  });

  test('refuses pushes once the hourly allowance is spent', async () => {
    const { backend, user } = await signedIn(alice, 'phone');
    await user.mutation(api.sync.push, { installationId: 'phone', changes: { transactions: [lunch()] } });
    await backend.run(async (ctx) => {
      const owner = await ctx.db.query('owners').unique();
      await ctx.db.patch(owner!._id, { pushAllowance: 3, pushAllowanceAt: Date.now() });
    });

    await expect(
      user.mutation(api.sync.push, {
        installationId: 'phone',
        changes: { transactions: [lunch({ clientId: 'a' }), lunch({ clientId: 'b' }), lunch({ clientId: 'c' })] },
      }),
    ).rejects.toThrow('Too many');
  });

  test('does not rewrite the device on every push', async () => {
    const { backend, user } = await signedIn(alice, 'phone');
    const before = await backend.run((ctx) => ctx.db.query('devices').unique());

    await user.mutation(api.sync.push, { installationId: 'phone', changes: { transactions: [lunch()] } });
    const after = await backend.run((ctx) => ctx.db.query('devices').unique());

    expect(after!.lastSeenAt).toBe(before!.lastSeenAt);
  });

  test('grants exchange rate lookups up to the hourly allowance', async () => {
    const backend = convexTest(schema, modules);

    const granted = await backend.mutation(internal.owners.spendRateLookups, {
      ownerId: 'user_alice',
      requested: 150,
    });
    const rest = await backend.mutation(internal.owners.spendRateLookups, {
      ownerId: 'user_alice',
      requested: 150,
    });

    expect(granted).toBe(150);
    expect(rest).toBe(50);
  });
});
