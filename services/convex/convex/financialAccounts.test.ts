import { describe, expect, test } from 'bun:test';
import { convexTest } from 'convex-test';

import { api } from './_generated/api';
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

function savings(overrides: Record<string, unknown> = {}) {
  return {
    clientId: 'account-savings',
    bank: 'millennium',
    name: 'Oszczędnościowe',
    isGeneral: false,
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

describe('financialAccounts', () => {
  test('refuses every call without a signed-in user', async () => {
    const backend = convexTest(schema, modules);

    await expect(
      backend.mutation(api.sync.push, { installationId: 'phone', changes: { financialAccounts: [savings()] } }),
    ).rejects.toThrow();
    await expect(pulled(backend, 'phone', 'financialAccounts')).rejects.toThrow();
  });

  test('reads an account back on another device of the same user, once per client id', async () => {
    const { backend, user } = await signedIn(alice, 'phone');
    await user.mutation(api.sync.push, { installationId: 'phone', changes: { financialAccounts: [savings()] } });
    await user.mutation(api.sync.push, { installationId: 'phone', changes: { financialAccounts: [savings()] } });

    const tablet = backend.withIdentity({ ...alice, sid: 'sess_alice_tablet' });
    await tablet.mutation(api.devices.register, { installationId: 'tablet', platform: 'ios' });

    expect(await pulled(tablet, 'tablet', 'financialAccounts')).toEqual([savings()]);
  });

  test('keeps a renamed general account under its fixed id', async () => {
    const { user } = await signedIn(alice, 'phone');
    const general = savings({ clientId: 'general-millennium', name: 'Millennium', isGeneral: true });
    await user.mutation(api.sync.push, { installationId: 'phone', changes: { financialAccounts: [general] } });
    await user.mutation(api.sync.push, {
      installationId: 'phone',
      changes: { financialAccounts: [{ ...general, name: 'Konto osobiste', revision: 2 }] },
    });

    const [stored] = await pulled(user, 'phone', 'financialAccounts');

    expect(stored).toMatchObject({ clientId: 'general-millennium', name: 'Konto osobiste' });
  });

  test('never shows or changes the accounts of another user', async () => {
    const { backend, user } = await signedIn(alice, 'phone');
    await user.mutation(api.sync.push, { installationId: 'phone', changes: { financialAccounts: [savings()] } });

    const other = backend.withIdentity(bob);
    await other.mutation(api.devices.register, { installationId: 'phone', platform: 'ios' });

    expect(await pulled(other, 'phone', 'financialAccounts')).toEqual([]);

    await other.mutation(api.sync.push, {
      installationId: 'phone',
      changes: { financialAccounts: [savings({ name: 'Przejęte', revision: 9 })] },
    });

    expect((await pulled(user, 'phone', 'financialAccounts'))[0]).toMatchObject({
      name: 'Oszczędnościowe',
    });
  });

  test('rejects an empty or overly long name', async () => {
    const { user } = await signedIn(alice, 'phone');

    for (const name of ['  ', 'x'.repeat(61)]) {
      await expect(
        user.mutation(api.sync.push, {
          installationId: 'phone',
          changes: { financialAccounts: [savings({ name })] },
        }),
      ).rejects.toThrow();
    }
  });

  test('rejects an account from a bank that is not enabled', async () => {
    const { user } = await signedIn(alice, 'phone');

    await expect(
      user.mutation(api.sync.push, {
        installationId: 'phone',
        changes: { financialAccounts: [savings({ bank: 'x'.repeat(10_000) })] },
      }),
    ).rejects.toThrow('enabled bank');
  });
});
