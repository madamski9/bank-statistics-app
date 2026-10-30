import { describe, expect, test } from 'bun:test';
import { convexTest } from 'convex-test';

import { api, internal } from './_generated/api';
import { newOwner } from './owners';
import schema from './schema';

const moduleFiles = new Bun.Glob('**/*.{ts,js}').scanSync({ cwd: import.meta.dir });
const modules = Object.fromEntries(
  [...moduleFiles]
    .filter((path) => !path.endsWith('.test.ts'))
    .map((path) => [`./${path}`, () => import(`./${path}`)]),
);

const alice = { subject: 'user_alice', issuer: 'https://clerk.test', sid: 'sess_alice_phone' };
const bob = { subject: 'user_bob', issuer: 'https://clerk.test', sid: 'sess_bob_phone' };

describe('legacy owner', () => {
  test('reports the account a migrated owner used before', async () => {
    const backend = convexTest(schema, modules);

    await backend.run((ctx) =>
      ctx.db.insert('owners', { ...newOwner(alice.subject, 0), legacyOwnerId: 'user_alice_beta' }),
    );

    expect(await backend.withIdentity(alice).query(api.owners.legacyOwnerId, {})).toBe('user_alice_beta');
  });

  test('reports nothing for an owner that was not migrated or never synced', async () => {
    const backend = convexTest(schema, modules);

    await backend.run((ctx) => ctx.db.insert('owners', newOwner(alice.subject, 0)));

    expect(await backend.withIdentity(alice).query(api.owners.legacyOwnerId, {})).toBeNull();
    expect(await backend.withIdentity(bob).query(api.owners.legacyOwnerId, {})).toBeNull();
  });

  test('requires a signed-in user', async () => {
    const backend = convexTest(schema, modules);

    await expect(backend.query(api.owners.legacyOwnerId, {})).rejects.toThrow();
  });

  test('links a production account to its beta account after its first sign-in', async () => {
    const backend = convexTest(schema, modules);

    await backend.mutation(internal.owners.linkLegacyOwner, { ownerId: alice.subject, legacyOwnerId: 'user_alice_beta' });

    expect(await backend.withIdentity(alice).query(api.owners.legacyOwnerId, {})).toBe('user_alice_beta');
  });

  test('keeps the sync position of an owner it links', async () => {
    const backend = convexTest(schema, modules);

    await backend.run((ctx) => ctx.db.insert('owners', { ...newOwner(alice.subject, 0), sequence: 12 }));
    await backend.mutation(internal.owners.linkLegacyOwner, { ownerId: alice.subject, legacyOwnerId: 'user_alice_beta' });

    const owners = await backend.run((ctx) => ctx.db.query('owners').collect());

    expect(owners).toHaveLength(1);
    expect(owners[0]).toMatchObject({ sequence: 12, legacyOwnerId: 'user_alice_beta' });
  });
});
