import { afterEach, beforeAll, describe, expect, test } from 'bun:test';
import { convexTest } from 'convex-test';
import { ConvexError } from 'convex/values';

import { api } from './_generated/api';
import { isIdentityCheckRequired } from './owner';
import schema from './schema';
import { isRecentlyVerifiedSession, type SigningKey } from './sessionToken';

const moduleFiles = new Bun.Glob('**/*.{ts,js}').scanSync({ cwd: import.meta.dir });
const modules = Object.fromEntries(
  [...moduleFiles]
    .filter((path) => !path.endsWith('.test.ts'))
    .map((path) => [`./${path}`, () => import(`./${path}`)]),
);

const issuer = 'https://clerk.test';
const now = Date.UTC(2026, 9, 7, 12, 0, 0);
const owner = { ownerId: 'user_alice', sessionId: 'sess_alice_phone' };
const alice = { subject: owner.ownerId, issuer, sid: owner.sessionId };

let signingKey: SigningKey;
let privateKey: CryptoKey;
let foreignPrivateKey: CryptoKey;

function base64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function encodeJson(value: unknown): string {
  return base64Url(new TextEncoder().encode(JSON.stringify(value)));
}

async function signToken(claims: Record<string, unknown>, key = privateKey, kid = 'key_main'): Promise<string> {
  const content = `${encodeJson({ alg: 'RS256', kid, typ: 'JWT' })}.${encodeJson(claims)}`;
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(content));

  return `${content}.${base64Url(new Uint8Array(signature))}`;
}

function freshClaims(overrides: Record<string, unknown> = {}) {
  const issuedAt = Math.floor(now / 1000);

  return {
    iss: issuer,
    sub: owner.ownerId,
    sid: owner.sessionId,
    iat: issuedAt,
    nbf: issuedAt - 10,
    exp: issuedAt + 60,
    fva: [0, -1],
    ...overrides,
  };
}

async function generatePair() {
  return crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['sign', 'verify'],
  );
}

beforeAll(async () => {
  const pair = await generatePair();
  const publicJwk = await crypto.subtle.exportKey('jwk', pair.publicKey);
  signingKey = { kid: 'key_main', kty: 'RSA', n: publicJwk.n, e: publicJwk.e };
  privateKey = pair.privateKey;
  foreignPrivateKey = (await generatePair()).privateKey;
});

async function isVerified(token: string, at = now) {
  return isRecentlyVerifiedSession({ token, keys: [signingKey], issuer, owner, now: at });
}

describe('session token verification', () => {
  test('accepts a token issued right after the identity check', async () => {
    expect(await isVerified(await signToken(freshClaims()))).toBe(true);
  });

  test('refuses a first factor verified too long ago', async () => {
    for (const fva of [[11, -1], [-1, -1], undefined, '0']) {
      expect(await isVerified(await signToken(freshClaims({ fva })))).toBe(false);
    }
  });

  test('refuses a token signed by another key or naming an unknown key', async () => {
    expect(await isVerified(await signToken(freshClaims(), foreignPrivateKey))).toBe(false);
    expect(await isVerified(await signToken(freshClaims(), privateKey, 'key_other'))).toBe(false);
  });

  test('refuses a token edited after it was signed', async () => {
    const [header, , signature] = (await signToken(freshClaims({ fva: [30, -1] }))).split('.');

    expect(await isVerified(`${header}.${encodeJson(freshClaims())}.${signature}`)).toBe(false);
  });

  test('refuses a token of another user, session or issuer', async () => {
    for (const overrides of [{ sub: 'user_bob' }, { sid: 'sess_other' }, { iss: 'https://evil.test' }]) {
      expect(await isVerified(await signToken(freshClaims(overrides)))).toBe(false);
    }
  });

  test('refuses an expired token and one that is not valid yet', async () => {
    const token = await signToken(freshClaims());

    expect(await isVerified(token, now + 120_000)).toBe(false);
    expect(await isVerified(token, now - 60_000)).toBe(false);
  });

  test('refuses something that is not a token', async () => {
    for (const token of ['', 'a.b', 'a.b.c', 'not a token at all']) {
      expect(await isVerified(token)).toBe(false);
    }
  });
});

describe('starting an account deletion', () => {
  const originalFetch = globalThis.fetch;
  const originalIssuer = process.env.CLERK_JWT_ISSUER_DOMAIN;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env.CLERK_JWT_ISSUER_DOMAIN = originalIssuer;
  });

  async function withRegisteredPhone() {
    globalThis.fetch = (async () => Response.json({ keys: [signingKey] })) as unknown as typeof fetch;
    process.env.CLERK_JWT_ISSUER_DOMAIN = issuer;
    const backend = convexTest(schema, modules);
    const user = backend.withIdentity(alice);
    await user.mutation(api.devices.register, { installationId: 'phone', platform: 'ios' });

    return { backend, user };
  }

  test('starts after a fresh identity check and lets the app continue it', async () => {
    const { user } = await withRegisteredPhone();
    const issuedAt = Math.floor(Date.now() / 1000);
    const token = await signToken(freshClaims({ iat: issuedAt, nbf: issuedAt - 10, exp: issuedAt + 60 }));

    expect(await user.action(api.account.startDeletion, { sessionToken: token })).toEqual({ isComplete: true });
    expect(await user.mutation(api.account.deleteData, {})).toEqual({ isComplete: true });
  });

  test('asks for the identity check again when the token is stale', async () => {
    const { backend, user } = await withRegisteredPhone();
    const issuedAt = Math.floor(Date.now() / 1000);
    const token = await signToken(freshClaims({ fva: [30, -1], iat: issuedAt, nbf: issuedAt - 10, exp: issuedAt + 60 }));

    const refusal = await user.action(api.account.startDeletion, { sessionToken: token }).catch((error: unknown) => error);

    expect(refusal instanceof ConvexError && isIdentityCheckRequired(refusal.data)).toBe(true);
    const owners = await backend.run((ctx) => ctx.db.query('owners').collect());
    expect(owners.every((row) => row.deletionRequestedAt === undefined)).toBe(true);
  });

  test('refuses an anonymous caller', async () => {
    const { backend } = await withRegisteredPhone();

    await expect(backend.action(api.account.startDeletion, { sessionToken: 'a.b.c' })).rejects.toThrow('Sign in');
  });
});
