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
  await user.mutation(api.devices.register, { installationId: 'phone', platform: 'ios' });
  await user.mutation(api.devices.register, { installationId: 'tablet', platform: 'ios' });

  return { backend, user };
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
    const { user } = await twoDevices();
    const tablet = (await user.query(api.devices.list, { installationId: 'phone' })).find(
      (device) => !device.isCurrent,
    );

    await user.mutation(api.devices.revoke, { installationId: 'phone', deviceId: tablet!.id });
    await user.mutation(api.devices.revoke, { installationId: 'phone', deviceId: tablet!.id });

    expect(await user.query(api.devices.standing, { installationId: 'tablet' })).toBe('revoked');
    await expect(user.query(api.transactions.list, { installationId: 'tablet' })).rejects.toThrow(
      'revoked',
    );
    await expect(
      user.mutation(api.transactions.push, { installationId: 'tablet', changes: [lunch()] }),
    ).rejects.toThrow('revoked');
    await expect(
      user.mutation(api.devices.register, { installationId: 'tablet', platform: 'ios' }),
    ).rejects.toThrow('revoked');
    expect(await user.query(api.devices.list, { installationId: 'phone' })).toHaveLength(1);
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
    const { user } = await twoDevices();
    const devices = await user.query(api.devices.list, { installationId: 'phone' });
    const phone = devices.find((device) => device.isCurrent)!;
    const tablet = devices.find((device) => !device.isCurrent)!;

    await user.mutation(api.devices.revoke, { installationId: 'phone', deviceId: tablet.id });

    await expect(
      user.mutation(api.devices.revoke, { installationId: 'tablet', deviceId: phone.id }),
    ).rejects.toThrow('revoked');
  });

  test('reports an unknown installation as unregistered and refuses anonymous callers', async () => {
    const { backend, user } = await twoDevices();

    expect(await user.query(api.devices.standing, { installationId: 'laptop' })).toBe('unregistered');
    await expect(backend.query(api.devices.standing, { installationId: 'phone' })).rejects.toThrow();
    await expect(backend.query(api.devices.list, { installationId: 'phone' })).rejects.toThrow();
  });
});
