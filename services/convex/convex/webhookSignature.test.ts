import { describe, expect, test } from 'bun:test';
import { convexTest } from 'convex-test';

import { api } from './_generated/api';
import schema from './schema';
import { isValidWebhook, webhookSignature } from './webhookSignature';

const moduleFiles = new Bun.Glob('**/*.{ts,js}').scanSync({ cwd: import.meta.dir });
const modules = Object.fromEntries(
  [...moduleFiles]
    .filter((path) => !path.endsWith('.test.ts'))
    .map((path) => [`./${path}`, () => import(`./${path}`)]),
);

const secret = `whsec_${btoa('a test signing secret of decent length')}`;
const now = 1_800_000_000_000;
const timestamp = String(now / 1000);
const body = JSON.stringify({ type: 'user.deleted', data: { id: 'user_alice' } });

async function signed(content = body, at = timestamp) {
  return `v1,${await webhookSignature(secret, `msg_1.${at}.${content}`)}`;
}

describe('webhook signature', () => {
  test('accepts a message signed with the shared secret', async () => {
    const signatureHeader = `v1,bm90IGl0 ${await signed()}`;

    expect(await isValidWebhook({ secret, messageId: 'msg_1', timestamp, signatureHeader, body, now })).toBe(true);
  });

  test('refuses a changed body, a foreign secret and a stale timestamp', async () => {
    const signatureHeader = await signed();

    expect(
      await isValidWebhook({ secret, messageId: 'msg_1', timestamp, signatureHeader, body: `${body} `, now }),
    ).toBe(false);
    expect(
      await isValidWebhook({
        secret: `whsec_${btoa('another secret')}`,
        messageId: 'msg_1',
        timestamp,
        signatureHeader,
        body,
        now,
      }),
    ).toBe(false);
    expect(
      await isValidWebhook({ secret, messageId: 'msg_1', timestamp, signatureHeader, body, now: now + 10 * 60_000 }),
    ).toBe(false);
  });
});

describe('Clerk webhook', () => {
  test('starts deleting the data of a user deleted in Clerk and refuses unsigned calls', async () => {
    process.env.CLERK_WEBHOOK_SIGNING_SECRET = secret;
    const backend = convexTest(schema, modules);
    const alice = backend.withIdentity({ subject: 'user_alice', issuer: 'https://clerk.test', sid: 'sess_alice' });
    await alice.mutation(api.devices.register, { installationId: 'phone', platform: 'ios' });
    const sentAt = String(Math.floor(Date.now() / 1000));

    const unsigned = await backend.fetch('/clerk/webhook', { method: 'POST', body });
    const accepted = await backend.fetch('/clerk/webhook', {
      method: 'POST',
      body,
      headers: { 'svix-id': 'msg_1', 'svix-timestamp': sentAt, 'svix-signature': await signed(body, sentAt) },
    });

    expect(unsigned.status).toBe(401);
    expect(accepted.status).toBe(204);
    expect(await alice.query(api.devices.standing, { installationId: 'phone' })).toBe('accountDeleted');
  });
});
