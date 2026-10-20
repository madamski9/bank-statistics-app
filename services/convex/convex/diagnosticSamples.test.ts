import { describe, expect, test } from 'bun:test';
import { convexTest } from 'convex-test';

import { api, internal } from './_generated/api';
import { diagnosticRetentionMs } from './diagnosticSamples';
import schema from './schema';

const moduleFiles = new Bun.Glob('**/*.{ts,js}').scanSync({ cwd: import.meta.dir });
const modules = Object.fromEntries(
  [...moduleFiles]
    .filter((path) => !path.endsWith('.test.ts'))
    .map((path) => [`./${path}`, () => import(`./${path}`)]),
);
const alice = { subject: 'user_alice', issuer: 'https://clerk.test', sid: 'sess_alice_phone' };
const bob = { subject: 'user_bob', issuer: 'https://clerk.test', sid: 'sess_bob_phone' };
const sample = {
  clientId: 'sample-test',
  notification: {
    title: 'Przelew z konta',
    subtitle: '',
    body: '12,34 PLN do OSOBA TESTOWA',
    sourceApp: 'pl.mbank',
  },
  clientParserVersion: 6,
  reasonCode: 'noMatchingRule',
  reviewed: true as const,
};

describe('diagnostic samples', () => {
  test('stores only the submitted sample and computes JSON from that sample', async () => {
    const backend = convexTest(schema, modules);
    const id = await backend.withIdentity(alice).mutation(api.diagnosticSamples.submit, sample);
    const stored = await backend.run((ctx) => ctx.db.get(id));
    expect(stored?.notification).toEqual(sample.notification);
    expect(JSON.parse(stored!.resultJson).record.merchant).toBe('OSOBA TESTOWA');
    expect(JSON.parse(stored!.resultJson).record.amountMinor).toBe(1234);
    expect(stored!.expiresAt - stored!.submittedAt).toBe(diagnosticRetentionMs);
    expect(await backend.run((ctx) => ctx.db.query('transactions').collect())).toHaveLength(0);
    expect(await backend.run((ctx) => ctx.db.query('devices').collect())).toHaveLength(0);
  });

  test('retries are idempotent and identifiers are scoped to their owner', async () => {
    const backend = convexTest(schema, modules);
    const first = await backend.withIdentity(alice).mutation(api.diagnosticSamples.submit, sample);
    expect(await backend.withIdentity(alice).mutation(api.diagnosticSamples.submit, sample)).toBe(
      first,
    );
    expect(await backend.withIdentity(bob).mutation(api.diagnosticSamples.submit, sample)).not.toBe(
      first,
    );
    expect(await backend.run((ctx) => ctx.db.query('diagnosticSamples').collect())).toHaveLength(2);
  });

  test('refuses anonymous submissions and missing review confirmation', async () => {
    const backend = convexTest(schema, modules);
    await expect(backend.mutation(api.diagnosticSamples.submit, sample)).rejects.toThrow('Sign in');
    await expect(
      backend
        .withIdentity(alice)
        .mutation(api.diagnosticSamples.submit, { ...sample, reviewed: false as never }),
    ).rejects.toThrow();
  });

  test('rejects oversized samples and obvious personal identifiers', async () => {
    const backend = convexTest(schema, modules);
    for (const body of [
      'Kontakt: jan@example.com 12 PLN',
      'Rachunek: PL 12 1234 1234 1234 1234 1234 1234',
      'Telefon: +48 501 234 567',
      'a'.repeat(8001),
    ]) {
      await expect(
        backend
          .withIdentity(alice)
          .mutation(api.diagnosticSamples.submit, {
            ...sample,
            notification: { ...sample.notification, body },
          }),
      ).rejects.toThrow('Diagnostic sample');
    }
    expect(await backend.run((ctx) => ctx.db.query('diagnosticSamples').collect())).toHaveLength(0);
  });

  test('limits submissions without requiring cloud synchronization', async () => {
    const backend = convexTest(schema, modules);
    for (let index = 0; index < 10; index += 1) {
      await backend
        .withIdentity(alice)
        .mutation(api.diagnosticSamples.submit, { ...sample, clientId: `sample-${index}` });
    }
    await expect(
      backend
        .withIdentity(alice)
        .mutation(api.diagnosticSamples.submit, { ...sample, clientId: 'sample-eleven' }),
    ).rejects.toThrow('tomorrow');
    await expect(
      backend
        .withIdentity(alice)
        .mutation(api.diagnosticSamples.submit, { ...sample, clientId: 'sample-0' }),
    ).resolves.toBeString();
  });

  test('rejects a revoked session and an account being deleted', async () => {
    const backend = convexTest(schema, modules);
    await backend.run((ctx) =>
      ctx.db.insert('devices', {
        ownerId: alice.subject,
        installationId: 'phone',
        sessionId: alice.sid,
        platform: 'ios',
        registeredAt: 1,
        lastSeenAt: 1,
        revokedAt: 2,
      }),
    );
    await expect(
      backend.withIdentity(alice).mutation(api.diagnosticSamples.submit, sample),
    ).rejects.toThrow('revoked');
    await backend.withIdentity(bob).mutation(internal.account.beginDeletion, {});
    await expect(
      backend.withIdentity(bob).mutation(api.diagnosticSamples.submit, sample),
    ).rejects.toThrow('deleted');
  });

  test('purges only expired samples', async () => {
    const backend = convexTest(schema, modules);
    const expired = await backend
      .withIdentity(alice)
      .mutation(api.diagnosticSamples.submit, sample);
    const current = await backend.withIdentity(bob).mutation(api.diagnosticSamples.submit, sample);
    await backend.run((ctx) => ctx.db.patch(expired, { expiresAt: Date.now() - 1 }));
    await backend.mutation(internal.diagnosticSamples.purgeExpired, {});
    expect(await backend.run((ctx) => ctx.db.get(expired))).toBeNull();
    expect(await backend.run((ctx) => ctx.db.get(current))).not.toBeNull();
  });

  test('deleting an account removes its samples while preserving another owner', async () => {
    const backend = convexTest(schema, modules);
    const first = await backend.withIdentity(alice).mutation(api.diagnosticSamples.submit, sample);
    const second = await backend.withIdentity(bob).mutation(api.diagnosticSamples.submit, sample);
    await backend.withIdentity(alice).mutation(internal.account.beginDeletion, {});
    expect(await backend.run((ctx) => ctx.db.get(first))).toBeNull();
    expect(await backend.run((ctx) => ctx.db.get(second))).not.toBeNull();
  });
});
