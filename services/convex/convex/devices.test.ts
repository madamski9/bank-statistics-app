import { describe, expect, test } from 'bun:test';
import { convexTest } from 'convex-test';

import { api } from './_generated/api';
import { maximumActiveDevices } from './devices';
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

function lunch() {
  return {
    clientId: 'manual-lunch',
    bank: 'manual',
    origin: 'manual' as const,
    direction: 'expense' as const,
    amountMinor: 3450,
    currency: 'PLN',
    accountId: 'general-manual',
    occurredAt: '2026-09-20T12:30:00.000Z',
    capturedAt: '2026-09-20T12:31:00.000Z',
    status: 'posted' as const,
    revision: 1,
    deleted: false,
  };
}

async function twoDevices() {
  const backend = convexTest(schema, modules);
  const user = backend.withIdentity(alice);
  const tablet = backend.withIdentity({ ...alice, sid: 'sess_alice_tablet' });
  await user.mutation(api.devices.register, { installationId: 'phone', platform: 'ios' });
  await tablet.mutation(api.devices.register, { installationId: 'tablet', platform: 'ios' });

  return { backend, user, tablet };
}

async function tabletId(user: Pick<ReturnType<typeof convexTest>, 'query'>) {
  const devices = await user.query(api.devices.list, { installationId: 'phone' });

  return devices.find((device) => !device.isCurrent)!.id;
}

describe('devices', () => {
  test('lists every authorized device of the user and marks the current one', async () => {
    const { backend, user } = await twoDevices();
    await backend
      .withIdentity(bob)
      .mutation(api.devices.register, { installationId: 'bob-phone', platform: 'ios' });

    const devices = await user.query(api.devices.list, { installationId: 'phone' });

    expect(devices).toHaveLength(2);
    expect(devices.filter((device) => device.isCurrent)).toHaveLength(1);
    expect(devices.every((device) => !('installationId' in device))).toBe(true);
  });

  test('revokes another device so it can no longer read, push or register again', async () => {
    const { user, tablet } = await twoDevices();
    const deviceId = await tabletId(user);

    await user.mutation(api.devices.revoke, { installationId: 'phone', deviceId });
    await user.mutation(api.devices.revoke, { installationId: 'phone', deviceId });

    expect(await tablet.query(api.devices.standing, { installationId: 'tablet' })).toBe('revoked');
    await expect(pulled(tablet, 'tablet', 'transactions')).rejects.toThrow('revoked');
    await expect(
      tablet.mutation(api.sync.push, { installationId: 'tablet', changes: { transactions: [lunch()] } }),
    ).rejects.toThrow('revoked');
    await expect(
      tablet.mutation(api.devices.register, { installationId: 'tablet', platform: 'ios' }),
    ).rejects.toThrow('revoked');
    expect(await user.query(api.devices.list, { installationId: 'phone' })).toHaveLength(1);
  });

  test('keeps a revoked session out even under a fresh installation id', async () => {
    const { user, tablet } = await twoDevices();
    await user.mutation(api.devices.revoke, { installationId: 'phone', deviceId: await tabletId(user) });

    await expect(
      tablet.mutation(api.devices.register, { installationId: 'tablet-reinstalled', platform: 'ios' }),
    ).rejects.toThrow('revoked');
    await expect(tablet.mutation(api.account.deleteData, {})).rejects.toThrow('revoked');
    await expect(tablet.mutation(api.account.deleteCloudCopy, {})).rejects.toThrow('revoked');
  });

  test('lets the owner sign in again on a revoked device with a new session', async () => {
    const { backend, user } = await twoDevices();
    await user.mutation(api.devices.revoke, { installationId: 'phone', deviceId: await tabletId(user) });
    const signedInAgain = backend.withIdentity({ ...alice, sid: 'sess_alice_tablet_again' });

    await signedInAgain.mutation(api.devices.register, { installationId: 'tablet-new', platform: 'ios' });

    expect(await signedInAgain.query(api.devices.standing, { installationId: 'tablet-new' })).toBe('active');
  });

  test('asks an installation to register again after its session changed', async () => {
    const { backend } = await twoDevices();
    const newSession = backend.withIdentity({ ...alice, sid: 'sess_alice_phone_again' });

    await expect(pulled(newSession, 'phone', 'transactions')).rejects.toThrow('Register');
    expect(await newSession.query(api.sync.head, { installationId: 'phone' })).toBeNull();

    await newSession.mutation(api.devices.register, { installationId: 'phone', platform: 'ios' });

    expect(await pulled(newSession, 'phone', 'transactions')).toEqual([]);
    expect(await newSession.query(api.sync.head, { installationId: 'phone' })).toBe(0);
  });

  test('refuses a token without a session', async () => {
    const backend = convexTest(schema, modules);
    const sessionless = backend.withIdentity({ subject: 'user_alice', issuer: 'https://clerk.test' });

    await expect(
      sessionless.mutation(api.devices.register, { installationId: 'phone', platform: 'ios' }),
    ).rejects.toThrow('Sign in again');
  });

  test('caps the number of active devices', async () => {
    const backend = convexTest(schema, modules);

    for (let index = 0; index < maximumActiveDevices; index += 1) {
      await backend
        .withIdentity({ ...alice, sid: `sess_${index}` })
        .mutation(api.devices.register, { installationId: `device-${index}`, platform: 'ios' });
    }

    await expect(
      backend
        .withIdentity({ ...alice, sid: 'sess_extra' })
        .mutation(api.devices.register, { installationId: 'device-extra', platform: 'ios' }),
    ).rejects.toThrow('Remove one');
    await backend
      .withIdentity({ ...alice, sid: 'sess_0' })
      .mutation(api.devices.register, { installationId: 'device-0', platform: 'ios' });
  });

  test('never revokes the current device or a device of another user', async () => {
    const { backend, user } = await twoDevices();
    const current = (await user.query(api.devices.list, { installationId: 'phone' })).find(
      (device) => device.isCurrent,
    );
    const bobUser = backend.withIdentity(bob);
    await bobUser.mutation(api.devices.register, { installationId: 'bob-phone', platform: 'ios' });
    const [bobDevice] = await bobUser.query(api.devices.list, { installationId: 'bob-phone' });

    await expect(
      user.mutation(api.devices.revoke, { installationId: 'phone', deviceId: current!.id }),
    ).rejects.toThrow('Sign out');
    await expect(
      user.mutation(api.devices.revoke, { installationId: 'phone', deviceId: bobDevice!.id }),
    ).rejects.toThrow('does not belong');
    expect(await bobUser.query(api.devices.standing, { installationId: 'bob-phone' })).toBe('active');
  });

  test('a revoked device cannot revoke the others back', async () => {
    const { user, tablet } = await twoDevices();
    const devices = await user.query(api.devices.list, { installationId: 'phone' });
    const phone = devices.find((device) => device.isCurrent)!;

    await user.mutation(api.devices.revoke, { installationId: 'phone', deviceId: await tabletId(user) });

    await expect(
      tablet.mutation(api.devices.revoke, { installationId: 'tablet', deviceId: phone.id }),
    ).rejects.toThrow('revoked');
  });

  test('reports an unknown installation as unregistered and refuses anonymous callers', async () => {
    const { backend, user } = await twoDevices();

    expect(await user.query(api.devices.standing, { installationId: 'laptop' })).toBe('unregistered');
    await expect(backend.query(api.devices.standing, { installationId: 'phone' })).rejects.toThrow();
    await expect(backend.query(api.devices.list, { installationId: 'phone' })).rejects.toThrow();
  });
});
