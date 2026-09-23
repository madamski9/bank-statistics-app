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

const alice = { subject: 'user_alice', issuer: 'https://clerk.test' };
const bob = { subject: 'user_bob', issuer: 'https://clerk.test' };

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
      backend.mutation(api.financialAccounts.push, { installationId: 'phone', changes: [savings()] }),
    ).rejects.toThrow();
    await expect(backend.query(api.financialAccounts.list, {})).rejects.toThrow();
  });

  test('reads an account back on another device of the same user, once per client id', async () => {
    const { backend, user } = await signedIn(alice, 'phone');
    await user.mutation(api.financialAccounts.push, { installationId: 'phone', changes: [savings()] });
    await user.mutation(api.financialAccounts.push, { installationId: 'phone', changes: [savings()] });

    const tablet = backend.withIdentity(alice);
    await tablet.mutation(api.devices.register, { installationId: 'tablet', platform: 'ios' });

    expect(await tablet.query(api.financialAccounts.list, {})).toEqual([savings()]);
  });

  test('keeps a renamed general account under its fixed id', async () => {
    const { user } = await signedIn(alice, 'phone');
    const general = savings({ clientId: 'general-millennium', name: 'Millennium', isGeneral: true });
    await user.mutation(api.financialAccounts.push, { installationId: 'phone', changes: [general] });
    await user.mutation(api.financialAccounts.push, {
      installationId: 'phone',
      changes: [{ ...general, name: 'Konto osobiste', revision: 2 }],
    });

    const [stored] = await user.query(api.financialAccounts.list, {});

    expect(stored).toMatchObject({ clientId: 'general-millennium', name: 'Konto osobiste' });
  });

  test('never shows or changes the accounts of another user', async () => {
    const { backend, user } = await signedIn(alice, 'phone');
    await user.mutation(api.financialAccounts.push, { installationId: 'phone', changes: [savings()] });

    const other = backend.withIdentity(bob);
    await other.mutation(api.devices.register, { installationId: 'phone', platform: 'ios' });

    expect(await other.query(api.financialAccounts.list, {})).toEqual([]);

    await other.mutation(api.financialAccounts.push, {
      installationId: 'phone',
      changes: [savings({ name: 'Przejęte', revision: 9 })],
    });

    expect((await user.query(api.financialAccounts.list, {}))[0]).toMatchObject({
      name: 'Oszczędnościowe',
    });
  });

  test('rejects an empty or overly long name', async () => {
    const { user } = await signedIn(alice, 'phone');

    for (const name of ['  ', 'x'.repeat(61)]) {
      await expect(
        user.mutation(api.financialAccounts.push, {
          installationId: 'phone',
          changes: [savings({ name })],
        }),
      ).rejects.toThrow();
    }
  });
});
