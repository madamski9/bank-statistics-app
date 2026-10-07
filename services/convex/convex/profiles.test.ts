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

describe('profiles', () => {
  test('reports no premium for a user without a profile', async () => {
    const backend = convexTest(schema, modules);

    expect(await backend.withIdentity(alice).query(api.profiles.current, {})).toEqual({
      isPremium: false,
      premiumSince: null,
    });
  });

  test('grants premium to one user only and keeps the original start date', async () => {
    const backend = convexTest(schema, modules);

    await backend.mutation(internal.profiles.setPremium, { ownerId: alice.subject, isPremium: true });
    const granted = await backend.withIdentity(alice).query(api.profiles.current, {});

    await backend.mutation(internal.profiles.setPremium, { ownerId: alice.subject, isPremium: true });

    expect(granted.isPremium).toBe(true);
    expect(granted.premiumSince).toBeNumber();
    expect(await backend.withIdentity(alice).query(api.profiles.current, {})).toEqual(granted);
    expect((await backend.withIdentity(bob).query(api.profiles.current, {})).isPremium).toBe(false);
  });

  test('revokes premium', async () => {
    const backend = convexTest(schema, modules);

    await backend.mutation(internal.profiles.setPremium, { ownerId: alice.subject, isPremium: true });
    await backend.mutation(internal.profiles.setPremium, { ownerId: alice.subject, isPremium: false });

    expect(await backend.withIdentity(alice).query(api.profiles.current, {})).toEqual({
      isPremium: false,
      premiumSince: null,
    });
  });

  test('is removed together with the account data', async () => {
    const backend = convexTest(schema, modules);

    await backend.mutation(internal.profiles.setPremium, { ownerId: alice.subject, isPremium: true });
    await backend.withIdentity(alice).mutation(api.account.deleteData, {});

    const profiles = await backend.run((ctx) => ctx.db.query('profiles').collect());

    expect(profiles).toHaveLength(0);
  });

  test('refuses an anonymous caller', async () => {
    const backend = convexTest(schema, modules);

    await expect(backend.query(api.profiles.current, {})).rejects.toThrow('Sign in');
  });
});
