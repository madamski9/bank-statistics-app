import { afterEach, beforeEach, describe, expect, jest, test } from 'bun:test';
import { convexTest } from 'convex-test';

import { api, internal } from './_generated/api';
import { storeSubscriptionFrom, webhookOwnerIds, type RevenueCatCustomer } from './revenueCat';
import schema from './schema';

const moduleFiles = new Bun.Glob('**/*.{ts,js}').scanSync({ cwd: import.meta.dir });
const modules = Object.fromEntries(
  [...moduleFiles]
    .filter((path) => !path.endsWith('.test.ts'))
    .map((path) => [`./${path}`, () => import(`./${path}`)]),
);

const alice = { subject: 'user_alice', issuer: 'https://clerk.test', sid: 'sess_alice_phone' };
const bob = { subject: 'user_bob', issuer: 'https://clerk.test', sid: 'sess_bob_phone' };

const webhookAuthorization = 'Bearer webhook-secret';
const dayMs = 24 * 60 * 60 * 1000;
const now = Date.UTC(2026, 9, 23, 12);
const originalFetch = globalThis.fetch;
const originalEnvironment = { ...process.env };

function iso(time: number): string {
  return new Date(time).toISOString();
}

interface CustomerOptions {
  checkedAt?: number;
  expiresAt?: number | null;
  graceUntil?: number;
  periodType?: string;
  cancelledAt?: number;
  billingIssueAt?: number;
  refundedAt?: number;
  isSandbox?: boolean;
}

function customer(options: CustomerOptions = {}): RevenueCatCustomer {
  const checkedAt = options.checkedAt ?? now;
  const expiresAt = options.expiresAt === undefined ? checkedAt + 30 * dayMs : options.expiresAt;

  return {
    request_date_ms: checkedAt,
    subscriber: {
      entitlements: {
        bank_stats_premium: {
          expires_date: expiresAt === null ? null : iso(expiresAt),
          grace_period_expires_date: options.graceUntil === undefined ? null : iso(options.graceUntil),
          product_identifier: 'premium_monthly',
        },
      },
      subscriptions: {
        premium_monthly: {
          expires_date: expiresAt === null ? null : iso(expiresAt),
          grace_period_expires_date: options.graceUntil === undefined ? null : iso(options.graceUntil),
          period_type: options.periodType ?? 'normal',
          store: 'app_store',
          unsubscribe_detected_at: options.cancelledAt === undefined ? null : iso(options.cancelledAt),
          billing_issues_detected_at: options.billingIssueAt === undefined ? null : iso(options.billingIssueAt),
          refunded_at: options.refundedAt === undefined ? null : iso(options.refundedAt),
          is_sandbox: options.isSandbox ?? false,
        },
      },
      management_url: 'https://apps.apple.com/account/subscriptions',
    },
  };
}

const neverSubscribed: RevenueCatCustomer = {
  request_date_ms: now,
  subscriber: { entitlements: {}, subscriptions: {}, management_url: null },
};

function revenueCatServing(customers: Record<string, RevenueCatCustomer | number>, calls: string[] = []) {
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    calls.push(url);
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer sk_test');
    const appUserId = decodeURIComponent(url.split('/subscribers/')[1] ?? '');
    const answer = customers[appUserId] ?? neverSubscribed;

    return typeof answer === 'number'
      ? new Response('unavailable', { status: answer })
      : new Response(JSON.stringify(answer), { status: 200 });
  }) as typeof fetch;

  return calls;
}

function webhook(backend: ReturnType<typeof convexTest>, event: Record<string, unknown>, authorization = webhookAuthorization) {
  return backend.fetch('/revenuecat/webhook', {
    method: 'POST',
    headers: { Authorization: authorization, 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_version: '1.0', event: { id: 'event-1', ...event } }),
  });
}

function status(backend: ReturnType<typeof convexTest>, identity = alice) {
  return backend.withIdentity(identity).query(api.profiles.current, {});
}

beforeEach(() => {
  jest.useFakeTimers({ now });
  process.env.REVENUECAT_SECRET_API_KEY = 'sk_test';
  process.env.REVENUECAT_WEBHOOK_AUTHORIZATION = webhookAuthorization;
  delete process.env.REVENUECAT_ACCEPTS_SANDBOX;
});

afterEach(() => {
  jest.useRealTimers();
  globalThis.fetch = originalFetch;
  process.env = { ...originalEnvironment };
});

describe('store subscription snapshot', () => {
  test('grants access during a trial that renews', () => {
    expect(storeSubscriptionFrom(customer({ periodType: 'trial' }), now, false)).toMatchObject({
      isActive: true,
      isTrial: true,
      willRenew: true,
      accessUntil: now + 30 * dayMs,
    });
  });

  test('keeps a cancelled subscription active until it expires without renewing', () => {
    expect(storeSubscriptionFrom(customer({ cancelledAt: now - dayMs }), now, false)).toMatchObject({
      isActive: true,
      willRenew: false,
    });
  });

  test('extends access through the Apple billing grace period', () => {
    const snapshot = storeSubscriptionFrom(
      customer({ expiresAt: now - dayMs, graceUntil: now + 15 * dayMs, billingIssueAt: now - dayMs }),
      now,
      false,
    );

    expect(snapshot).toMatchObject({ isActive: true, hasBillingIssue: true, accessUntil: now + 15 * dayMs });
  });

  test('ends access once the subscription and its grace period have expired', () => {
    expect(storeSubscriptionFrom(customer({ expiresAt: now - dayMs }), now, false)).toEqual({
      isActive: false,
      willRenew: false,
      isTrial: false,
      hasBillingIssue: false,
      checkedAt: now,
    });
  });

  test('ignores sandbox purchases unless the deployment accepts them', () => {
    const sandbox = customer({ isSandbox: true });

    expect(storeSubscriptionFrom(sandbox, now, false).isActive).toBe(false);
    expect(storeSubscriptionFrom(sandbox, now, true).isActive).toBe(true);
  });

  test('reports no access for a customer who never subscribed', () => {
    expect(storeSubscriptionFrom(neverSubscribed, now, false).isActive).toBe(false);
  });

  test('treats an entitlement without an expiry as lasting access', () => {
    expect(storeSubscriptionFrom(customer({ expiresAt: null }), now, false)).toMatchObject({
      isActive: true,
      willRenew: false,
      accessUntil: undefined,
    });
  });

  test('reads only Clerk users from webhook events, including both sides of a transfer', () => {
    expect(
      webhookOwnerIds({
        event: {
          app_user_id: 'user_alice',
          transferred_from: ['$RCAnonymousID:abc', 'user_bob'],
          transferred_to: ['user_alice'],
        },
      }),
    ).toEqual(['user_alice', 'user_bob']);
    expect(webhookOwnerIds({ event: { app_user_id: 'test_user_from_dashboard' } })).toEqual([]);
    expect(webhookOwnerIds(null)).toEqual([]);
  });
});

describe('RevenueCat webhook', () => {
  test('grants Premium after a purchase and exposes the renewal details', async () => {
    const backend = convexTest(schema, modules);
    revenueCatServing({ user_alice: customer({ periodType: 'trial' }) });

    const response = await webhook(backend, { type: 'INITIAL_PURCHASE', app_user_id: 'user_alice' });

    expect(response.status).toBe(200);
    expect(await status(backend)).toEqual({
      isPremium: true,
      premiumSince: null,
      premiumUntil: null,
      subscription: {
        accessUntil: now + 30 * dayMs,
        willRenew: true,
        isTrial: true,
        hasBillingIssue: false,
        managementUrl: 'https://apps.apple.com/account/subscriptions',
      },
    });
    expect((await status(backend, bob)).isPremium).toBe(false);
  });

  test('rejects a webhook without the configured authorization and changes nothing', async () => {
    const backend = convexTest(schema, modules);
    const calls = revenueCatServing({ user_alice: customer() });

    const response = await webhook(backend, { type: 'INITIAL_PURCHASE', app_user_id: 'user_alice' }, 'Bearer guess');

    expect(response.status).toBe(401);
    expect(calls).toEqual([]);
    expect((await status(backend)).isPremium).toBe(false);
  });

  test('asks RevenueCat to retry while its customer lookup fails and keeps the last known access', async () => {
    const backend = convexTest(schema, modules);
    revenueCatServing({ user_alice: customer() });
    await webhook(backend, { type: 'INITIAL_PURCHASE', app_user_id: 'user_alice' });
    revenueCatServing({ user_alice: 503 });

    const response = await webhook(backend, { type: 'RENEWAL', app_user_id: 'user_alice' });

    expect(response.status).toBe(502);
    expect((await status(backend)).isPremium).toBe(true);
  });

  test('follows renewal, cancellation and expiry to the free product', async () => {
    const backend = convexTest(schema, modules);
    revenueCatServing({ user_alice: customer({ checkedAt: now }) });
    await webhook(backend, { type: 'INITIAL_PURCHASE', app_user_id: 'user_alice' });

    revenueCatServing({ user_alice: customer({ checkedAt: now + 31 * dayMs, expiresAt: now + 61 * dayMs }) });
    await webhook(backend, { type: 'RENEWAL', app_user_id: 'user_alice' });
    expect((await status(backend)).subscription?.accessUntil).toBe(now + 61 * dayMs);

    revenueCatServing({
      user_alice: customer({ checkedAt: now + 40 * dayMs, expiresAt: now + 61 * dayMs, cancelledAt: now + 40 * dayMs }),
    });
    await webhook(backend, { type: 'CANCELLATION', app_user_id: 'user_alice' });
    expect((await status(backend)).subscription).toMatchObject({ willRenew: false });
    expect((await status(backend)).isPremium).toBe(true);

    revenueCatServing({ user_alice: customer({ checkedAt: now + 62 * dayMs, expiresAt: now + 61 * dayMs }) });
    await webhook(backend, { type: 'EXPIRATION', app_user_id: 'user_alice' });
    expect(await status(backend)).toMatchObject({ isPremium: false, subscription: null });
  });

  test('ignores a snapshot older than the one already stored', async () => {
    const backend = convexTest(schema, modules);
    const expired = storeSubscriptionFrom(customer({ checkedAt: now + 62 * dayMs, expiresAt: now + 61 * dayMs }), now, false);
    const active = storeSubscriptionFrom(customer({ checkedAt: now }), now, false);

    await backend.mutation(internal.storeSubscriptions.apply, { ownerId: alice.subject, subscription: expired });
    await backend.mutation(internal.storeSubscriptions.apply, { ownerId: alice.subject, subscription: active });

    expect((await status(backend)).isPremium).toBe(false);
  });

  test('handles a replayed webhook without changing the result', async () => {
    const backend = convexTest(schema, modules);
    let checkedAt = now;
    globalThis.fetch = (async () => {
      checkedAt += 1000;
      return new Response(JSON.stringify(customer({ checkedAt, expiresAt: now + 30 * dayMs })), { status: 200 });
    }) as unknown as typeof fetch;

    await webhook(backend, { type: 'INITIAL_PURCHASE', app_user_id: 'user_alice' });
    const first = await status(backend);
    await webhook(backend, { type: 'INITIAL_PURCHASE', app_user_id: 'user_alice' });

    expect(await status(backend)).toEqual(first);
    expect(await backend.run((ctx) => ctx.db.query('profiles').collect())).toHaveLength(1);
  });

  test('moves Premium to the account that received a transferred purchase', async () => {
    const backend = convexTest(schema, modules);
    revenueCatServing({ user_bob: customer() });
    await webhook(backend, { type: 'INITIAL_PURCHASE', app_user_id: 'user_bob' });

    revenueCatServing({ user_alice: customer({ checkedAt: now + 1000 }), user_bob: { ...neverSubscribed, request_date_ms: now + 1000 } });
    await webhook(backend, { type: 'TRANSFER', transferred_from: ['user_bob'], transferred_to: ['user_alice'] });

    expect((await status(backend)).isPremium).toBe(true);
    expect((await status(backend, bob)).isPremium).toBe(false);
  });

  test('keeps sandbox purchases free of Premium on a deployment that does not accept them', async () => {
    const backend = convexTest(schema, modules);
    revenueCatServing({ user_alice: customer({ isSandbox: true }) });

    await webhook(backend, { type: 'INITIAL_PURCHASE', app_user_id: 'user_alice' });
    expect((await status(backend)).isPremium).toBe(false);

    process.env.REVENUECAT_ACCEPTS_SANDBOX = 'true';
    revenueCatServing({ user_alice: customer({ isSandbox: true, checkedAt: now + 1000 }) });
    await webhook(backend, { type: 'RENEWAL', app_user_id: 'user_alice' });
    expect((await status(backend)).isPremium).toBe(true);
  });

  test('acknowledges the dashboard test event without creating profiles', async () => {
    const backend = convexTest(schema, modules);
    const calls = revenueCatServing({});

    const response = await webhook(backend, { type: 'TEST', app_user_id: 'test_app_user' });

    expect(response.status).toBe(200);
    expect(calls).toEqual([]);
    expect(await backend.run((ctx) => ctx.db.query('profiles').collect())).toEqual([]);
  });

  test('keeps a gift code running when a store subscription ends', async () => {
    const backend = convexTest(schema, modules);
    await backend.mutation(internal.profiles.setPremium, { ownerId: alice.subject, isPremium: true });
    revenueCatServing({ user_alice: customer({ expiresAt: now - dayMs }) });

    await webhook(backend, { type: 'EXPIRATION', app_user_id: 'user_alice' });

    expect((await status(backend)).isPremium).toBe(true);
  });

  test('does not recreate the profile of an account that is being deleted', async () => {
    const backend = convexTest(schema, modules);
    await backend.mutation(internal.account.forgetDeletedUser, { ownerId: alice.subject });
    revenueCatServing({ user_alice: customer() });

    await webhook(backend, { type: 'RENEWAL', app_user_id: 'user_alice' });

    expect(await backend.run((ctx) => ctx.db.query('profiles').collect())).toEqual([]);
  });
});

describe('store subscription refresh', () => {
  test('restores Premium for the signed-in user after a purchase or restore on the device', async () => {
    const backend = convexTest(schema, modules);
    const calls = revenueCatServing({ user_alice: customer() });

    const result = await backend.withIdentity(alice).action(api.storeSubscriptions.refresh, {});

    expect(result).toEqual({ isActive: true });
    expect(calls).toEqual(['https://api.revenuecat.com/v1/subscribers/user_alice']);
    expect((await status(backend)).isPremium).toBe(true);
  });

  test('requires a signed-in user', async () => {
    const backend = convexTest(schema, modules);
    revenueCatServing({});

    await expect(backend.action(api.storeSubscriptions.refresh, {})).rejects.toThrow('Sign in');
  });

  test('schedules a recheck at expiry that returns the account to the free product', async () => {
    const backend = convexTest(schema, modules);
    revenueCatServing({ user_alice: customer() });
    await backend.withIdentity(alice).action(api.storeSubscriptions.refresh, {});
    const [profile] = await backend.run((ctx) => ctx.db.query('profiles').collect());
    const recheck = await backend.run((ctx) => ctx.db.system.get(profile!.storeSubscriptionRecheck!));

    expect(recheck?.scheduledTime).toBe(now + 30 * dayMs + 60 * 1000);
    expect(recheck?.name).toContain('recheck');

    revenueCatServing({ user_alice: customer({ checkedAt: now + 31 * dayMs, expiresAt: now + 30 * dayMs }) });
    await backend.action(internal.storeSubscriptions.recheck, { ownerId: alice.subject });

    expect((await status(backend)).isPremium).toBe(false);
  });

  test('replaces the pending recheck instead of stacking another one', async () => {
    const backend = convexTest(schema, modules);
    revenueCatServing({ user_alice: customer({ checkedAt: now }) });
    await backend.withIdentity(alice).action(api.storeSubscriptions.refresh, {});
    revenueCatServing({ user_alice: customer({ checkedAt: now + 1000, expiresAt: now + 60 * dayMs }) });
    await backend.withIdentity(alice).action(api.storeSubscriptions.refresh, {});

    const pending = await backend.run(async (ctx) =>
      (await ctx.db.system.query('_scheduled_functions').collect()).filter((job) => job.state.kind === 'pending'),
    );

    expect(pending).toHaveLength(1);
    expect(pending[0]?.scheduledTime).toBe(now + 60 * dayMs + 60 * 1000);
  });

  test('never looks up an account that is being deleted, so RevenueCat does not recreate its customer', async () => {
    const backend = convexTest(schema, modules);
    const calls = revenueCatServing({});
    await backend.mutation(internal.account.forgetDeletedUser, { ownerId: 'user_alice' });

    await backend.action(internal.storeSubscriptions.recheck, { ownerId: 'user_alice' });
    const response = await webhook(backend, { type: 'CANCELLATION', app_user_id: 'user_alice' });

    expect(response.status).toBe(200);
    expect(calls).toEqual([]);
  });
});

