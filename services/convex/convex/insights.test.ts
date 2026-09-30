import { afterEach, describe, expect, test } from 'bun:test';
import { convexTest } from 'convex-test';

import { api } from './_generated/api';
import { latestRateOnOrBefore } from './exchangeRates';
import schema from './schema';

const moduleFiles = new Bun.Glob('**/*.{ts,js}').scanSync({ cwd: import.meta.dir });
const modules = Object.fromEntries(
  [...moduleFiles]
    .filter((path) => !path.endsWith('.test.ts'))
    .map((path) => [`./${path}`, () => import(`./${path}`)]),
);

const alice = { subject: 'user_alice', issuer: 'https://clerk.test' };
const bob = { subject: 'user_bob', issuer: 'https://clerk.test' };
const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

async function signedIn(identity: typeof alice, installationId: string) {
  const backend = convexTest(schema, modules);
  const user = backend.withIdentity(identity);
  await user.mutation(api.devices.register, { installationId, platform: 'ios' });

  return { backend, user };
}

function trip(overrides: Record<string, unknown> = {}) {
  return {
    clientId: 'event-trip',
    name: 'Chorwacja',
    startedAt: '2026-07-01T08:00:00.000Z',
    revision: 1,
    deleted: false,
    ...overrides,
  };
}

function hobby(overrides: Record<string, unknown> = {}) {
  return { clientId: 'category-hobby', name: 'Hobby', revision: 1, deleted: false, ...overrides };
}

function nbpFetch(rates: { no: string; effectiveDate: string; mid: number }[], calls: string[]) {
  return (async (input: string | URL | Request) => {
    const url = String(input);
    calls.push(url);

    if (url.includes('/rates/A/')) {
      return new Response(JSON.stringify({ table: 'A', code: 'EUR', rates }), { status: 200 });
    }

    return new Response('404 NotFound', { status: 404 });
  }) as typeof fetch;
}

describe('categories', () => {
  test('reads a custom category back on another device of the same user only', async () => {
    const { backend, user } = await signedIn(alice, 'phone');
    await user.mutation(api.categories.push, { installationId: 'phone', changes: [hobby()] });

    const tablet = backend.withIdentity(alice);
    await tablet.mutation(api.devices.register, { installationId: 'tablet', platform: 'ios' });
    const other = backend.withIdentity(bob);
    await other.mutation(api.devices.register, { installationId: 'phone', platform: 'ios' });

    expect(await tablet.query(api.categories.list, { installationId: 'tablet' })).toEqual([hobby()]);
    expect(await other.query(api.categories.list, { installationId: 'phone' })).toEqual([]);
  });

  test('refuses a nameless category or one posing as a built-in category', async () => {
    const { user } = await signedIn(alice, 'phone');

    await expect(
      user.mutation(api.categories.push, { installationId: 'phone', changes: [hobby({ name: '  ' })] }),
    ).rejects.toThrow();
    await expect(
      user.mutation(api.categories.push, { installationId: 'phone', changes: [hobby({ clientId: 'groceries' })] }),
    ).rejects.toThrow();
  });
});

describe('events', () => {
  test('keeps an ended event with its window', async () => {
    const { user } = await signedIn(alice, 'phone');
    const ended = trip({ endedAt: '2026-07-14T20:00:00.000Z', revision: 2 });
    await user.mutation(api.events.push, { installationId: 'phone', changes: [trip()] });
    await user.mutation(api.events.push, { installationId: 'phone', changes: [ended] });

    expect(await user.query(api.events.list, { installationId: 'phone' })).toEqual([ended]);
  });

  test('refuses an event that ends before it starts', async () => {
    const { user } = await signedIn(alice, 'phone');

    await expect(
      user.mutation(api.events.push, {
        installationId: 'phone',
        changes: [trip({ endedAt: '2026-06-01T08:00:00.000Z' })],
      }),
    ).rejects.toThrow();
  });
});

describe('transactions with insights', () => {
  test('carries the event and the exchange rate snapshot of a foreign payment', async () => {
    const { user } = await signedIn(alice, 'phone');
    const payment = {
      clientId: 'capture-cafe',
      bank: 'millennium',
      origin: 'capture' as const,
      direction: 'expense' as const,
      transactionType: 'cardPayment' as const,
      amountMinor: 1250,
      currency: 'EUR',
      occurredAt: '2026-07-03T10:00:00Z',
      capturedAt: '2026-07-03T10:00:00Z',
      status: 'pending' as const,
      eventId: 'event-trip',
      reportingAmountMinor: 5342,
      exchangeRate: '4.2735',
      exchangeRateDate: '2026-07-03',
      exchangeRateTable: '127/A/NBP/2026',
      revision: 1,
      deleted: false,
    };
    await user.mutation(api.transactions.push, { installationId: 'phone', changes: [payment] });

    expect(await user.query(api.transactions.list, { installationId: 'phone' })).toEqual([payment]);
    await expect(
      user.mutation(api.transactions.push, {
        installationId: 'phone',
        changes: [{ ...payment, exchangeRate: 'lots', revision: 2 }],
      }),
    ).rejects.toThrow();
  });
});

describe('cloud copy', () => {
  test('removes synchronized data but keeps the device and the account', async () => {
    const { user } = await signedIn(alice, 'phone');
    await user.mutation(api.categories.push, { installationId: 'phone', changes: [hobby()] });
    await user.mutation(api.events.push, { installationId: 'phone', changes: [trip()] });

    expect(await user.mutation(api.account.deleteCloudCopy, {})).toEqual({ isComplete: true });
    expect(await user.query(api.categories.list, { installationId: 'phone' })).toEqual([]);
    expect(await user.query(api.events.list, { installationId: 'phone' })).toEqual([]);
    expect(await user.query(api.devices.list, { installationId: 'phone' })).toHaveLength(1);
  });
});

describe('exchange rates', () => {
  test('takes the latest NBP rate published on or before the day', () => {
    const rates = [
      { no: '1/A', effectiveDate: '2026-07-01', mid: 4.2 },
      { no: '2/A', effectiveDate: '2026-07-02', mid: 4.3 },
      { no: '3/A', effectiveDate: '2026-07-06', mid: 4.4 },
    ];

    expect(latestRateOnOrBefore(rates, '2026-07-05')?.no).toBe('2/A');
    expect(latestRateOnOrBefore(rates, '2026-06-30')).toBeNull();
  });

  test('answers a weekend payment with the Friday rate and remembers it', async () => {
    const calls: string[] = [];
    globalThis.fetch = nbpFetch([{ no: '128/A/NBP/2026', effectiveDate: '2026-07-03', mid: 4.2735 }], calls);
    const { user } = await signedIn(alice, 'phone');
    const request = { requests: [{ currency: 'EUR', date: '2026-07-05' }] };

    const first = await user.action(api.exchangeRates.snapshots, request);
    const second = await user.action(api.exchangeRates.snapshots, request);

    expect(first).toEqual([
      {
        currency: 'EUR',
        requestedDate: '2026-07-05',
        effectiveDate: '2026-07-03',
        mid: '4.2735',
        table: '128/A/NBP/2026',
      },
    ]);
    expect(second).toEqual(first);
    expect(calls).toHaveLength(1);
  });

  test('leaves a rate pending while NBP is unavailable', async () => {
    globalThis.fetch = (async () => new Response('down', { status: 503 })) as unknown as typeof fetch;
    const { user } = await signedIn(alice, 'phone');

    expect(
      await user.action(api.exchangeRates.snapshots, { requests: [{ currency: 'EUR', date: '2026-07-05' }] }),
    ).toEqual([]);
  });

  test('refuses an anonymous caller', async () => {
    const backend = convexTest(schema, modules);

    await expect(
      backend.action(api.exchangeRates.snapshots, { requests: [{ currency: 'EUR', date: '2026-07-05' }] }),
    ).rejects.toThrow();
  });
});
