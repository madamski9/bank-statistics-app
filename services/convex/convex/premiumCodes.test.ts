import { describe, expect, test } from 'bun:test';
import { convexTest } from 'convex-test';
import { ConvexError } from 'convex/values';

import { api, internal } from './_generated/api';
import { isPremiumAlreadyPermanent, isPremiumCodeInvalid } from './premiumCodeErrors';
import { normalizePremiumCode, premiumEndAfter } from './premiumCodes';
import schema from './schema';

const moduleFiles = new Bun.Glob('**/*.{ts,js}').scanSync({ cwd: import.meta.dir });
const modules = Object.fromEntries(
  [...moduleFiles]
    .filter((path) => !path.endsWith('.test.ts'))
    .map((path) => [`./${path}`, () => import(`./${path}`)]),
);

const alice = { subject: 'user_alice', issuer: 'https://clerk.test', sid: 'sess_alice_phone' };
const bob = { subject: 'user_bob', issuer: 'https://clerk.test', sid: 'sess_bob_phone' };

async function refusalOf(promise: Promise<unknown>): Promise<unknown> {
  const refusal = await promise.catch((error: unknown) => error);

  return refusal instanceof ConvexError ? refusal.data : refusal;
}

async function withCode(months?: number) {
  const backend = convexTest(schema, modules);
  const [code] = await backend.action(internal.premiumCodes.create, { months });

  return { backend, code: code as string };
}

describe('premium codes', () => {
  test('returns invalid-code validation without throwing or changing the account', async () => {
    const backend = convexTest(schema, modules);

    const result = await backend.withIdentity(alice).mutation(api.premiumCodes.redeemWithResult, { code: 'ABCDE-FGHJK' });

    expect(result).toMatchObject({ status: 'rejected', error: { code: 'premiumCodeInvalid' } });
    expect((await backend.withIdentity(alice).query(api.profiles.current, {})).isPremium).toBe(false);
    expect(await backend.run((ctx) => ctx.db.query('profiles').collect())).toEqual([]);
  });

  test('returns validation for an already-used code without granting another account Premium', async () => {
    const { backend, code } = await withCode(1);
    const first = await backend.withIdentity(alice).mutation(api.premiumCodes.redeemWithResult, { code });
    const second = await backend.withIdentity(bob).mutation(api.premiumCodes.redeemWithResult, { code });

    expect(first).toMatchObject({ status: 'redeemed', premiumUntil: expect.any(Number) });
    expect(second).toMatchObject({ status: 'rejected', error: { code: 'premiumCodeInvalid' } });
    expect((await backend.withIdentity(bob).query(api.profiles.current, {})).isPremium).toBe(false);
  });

  test('returns permanent-Premium validation and keeps the code available for another person', async () => {
    const { backend, code } = await withCode();
    await backend.mutation(internal.profiles.setPremium, { ownerId: alice.subject, isPremium: true });

    const rejected = await backend.withIdentity(alice).mutation(api.premiumCodes.redeemWithResult, { code });
    const redeemed = await backend.withIdentity(bob).mutation(api.premiumCodes.redeemWithResult, { code });

    expect(rejected).toMatchObject({ status: 'rejected', error: { code: 'premiumAlreadyPermanent' } });
    expect(redeemed).toEqual({ status: 'redeemed', premiumUntil: null });
    expect((await backend.withIdentity(bob).query(api.profiles.current, {})).isPremium).toBe(true);
  });

  test('still rejects an anonymous caller when returning validation results', async () => {
    const { backend, code } = await withCode(1);

    await expect(backend.mutation(api.premiumCodes.redeemWithResult, { code })).rejects.toThrow('Sign in');
  });

  test('creates readable codes without look-alike characters', async () => {
    const backend = convexTest(schema, modules);
    const codes = await backend.action(internal.premiumCodes.create, { months: 3, count: 20 });

    expect(codes).toHaveLength(20);
    expect(new Set(codes).size).toBe(20);

    for (const code of codes) {
      expect(code).toMatch(/^[A-HJ-NP-Z2-9]{5}-[A-HJ-NP-Z2-9]{5}$/);
    }
  });

  test('refuses impossible durations and batch sizes', async () => {
    const backend = convexTest(schema, modules);

    for (const args of [{ months: 0 }, { months: 1.5 }, { months: 121 }, { count: 0 }, { count: 51 }]) {
      await expect(backend.action(internal.premiumCodes.create, args)).rejects.toThrow();
    }
  });

  test('grants Premium for the chosen number of months', async () => {
    const { backend, code } = await withCode(3);
    const before = Date.now();

    const { premiumUntil } = await backend.withIdentity(alice).mutation(api.premiumCodes.redeem, { code });
    const status = await backend.withIdentity(alice).query(api.profiles.current, {});

    expect(status.isPremium).toBe(true);
    expect(premiumUntil).toBeGreaterThanOrEqual(premiumEndAfter(before, 3));
    expect(status.premiumUntil).toBe(premiumUntil);
  });

  test('grants permanent Premium when the code has no duration', async () => {
    const { backend, code } = await withCode();

    expect(await backend.withIdentity(alice).mutation(api.premiumCodes.redeem, { code })).toEqual({
      premiumUntil: null,
    });
    expect(await backend.withIdentity(alice).query(api.profiles.current, {})).toMatchObject({
      isPremium: true,
      premiumUntil: null,
    });
  });

  test('accepts the code in any letter case, with or without the dash', async () => {
    const { backend, code } = await withCode(1);

    await backend.withIdentity(alice).mutation(api.premiumCodes.redeem, { code: ` ${code.toLowerCase().replace('-', ' ')} ` });

    expect((await backend.withIdentity(alice).query(api.profiles.current, {})).isPremium).toBe(true);
  });

  test('works only once', async () => {
    const { backend, code } = await withCode(1);
    await backend.withIdentity(alice).mutation(api.premiumCodes.redeem, { code });

    const refusal = await refusalOf(backend.withIdentity(bob).mutation(api.premiumCodes.redeem, { code }));

    expect(isPremiumCodeInvalid(refusal)).toBe(true);
    expect((await backend.withIdentity(bob).query(api.profiles.current, {})).isPremium).toBe(false);
  });

  test('refuses a code that was never created', async () => {
    const backend = convexTest(schema, modules);

    const refusal = await refusalOf(backend.withIdentity(alice).mutation(api.premiumCodes.redeem, { code: 'ABCDE-FGHJK' }));

    expect(isPremiumCodeInvalid(refusal)).toBe(true);
  });

  test('extends a running gift instead of starting it again', async () => {
    const { backend, code } = await withCode(1);
    const [second] = await backend.action(internal.premiumCodes.create, { months: 2 });
    const { premiumUntil: firstEnd } = await backend.withIdentity(alice).mutation(api.premiumCodes.redeem, { code });

    const { premiumUntil: secondEnd } = await backend
      .withIdentity(alice)
      .mutation(api.premiumCodes.redeem, { code: second as string });

    expect(secondEnd).toBe(premiumEndAfter(firstEnd as number, 2));
  });

  test('keeps a code unused for someone who already has permanent Premium', async () => {
    const { backend, code } = await withCode(1);
    await backend.mutation(internal.profiles.setPremium, { ownerId: alice.subject, isPremium: true });

    const refusal = await refusalOf(backend.withIdentity(alice).mutation(api.premiumCodes.redeem, { code }));
    await backend.withIdentity(bob).mutation(api.premiumCodes.redeem, { code });

    expect(isPremiumAlreadyPermanent(refusal)).toBe(true);
    expect((await backend.withIdentity(bob).query(api.profiles.current, {})).isPremium).toBe(true);
  });

  test('ends a gift once its time is up, but not earlier', async () => {
    const { backend, code } = await withCode(1);
    await backend.withIdentity(alice).mutation(api.premiumCodes.redeem, { code });

    await backend.mutation(internal.premiumCodes.expire, { ownerId: alice.subject });
    expect((await backend.withIdentity(alice).query(api.profiles.current, {})).isPremium).toBe(true);

    await backend.run(async (ctx) => {
      const profile = await ctx.db.query('profiles').first();
      await ctx.db.patch(profile!._id, { premiumUntil: Date.now() - 1 });
    });
    await backend.mutation(internal.premiumCodes.expire, { ownerId: alice.subject });

    expect(await backend.withIdentity(alice).query(api.profiles.current, {})).toEqual({
      isPremium: false,
      premiumSince: null,
      premiumUntil: null,
    });
  });

  test('is refused to an anonymous caller', async () => {
    const { backend, code } = await withCode(1);

    await expect(backend.mutation(api.premiumCodes.redeem, { code })).rejects.toThrow('Sign in');
  });

  test('normalizes what people type', () => {
    expect(normalizePremiumCode(' abcde-fghjk ')).toBe('ABCDEFGHJK');
  });
});
