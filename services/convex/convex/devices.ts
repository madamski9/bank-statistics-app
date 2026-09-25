import { ConvexError, v } from 'convex/values';

import type { Doc } from './_generated/dataModel';
import { mutation, query, type QueryCtx } from './_generated/server';
import { isAccountDeleted } from './account';
import { requireOwnerId } from './owner';
import { devicePlatform } from './schema';

export async function findDevice(
  ctx: QueryCtx,
  ownerId: string,
  installationId: string,
): Promise<Doc<'devices'> | null> {
  return ctx.db
    .query('devices')
    .withIndex('by_owner_installation', (index) =>
      index.eq('ownerId', ownerId).eq('installationId', installationId),
    )
    .unique();
}

export async function requireActiveDevice(ctx: QueryCtx, installationId: string) {
  const ownerId = await requireOwnerId(ctx.auth);

  if (await isAccountDeleted(ctx, ownerId)) {
    throw new ConvexError('This account is being deleted.');
  }

  const device = await findDevice(ctx, ownerId, installationId);

  if (device === null) {
    throw new ConvexError('Register this device before synchronizing.');
  }

  if (device.revokedAt !== undefined) {
    throw new ConvexError('This device was revoked.');
  }

  return { ownerId, device };
}

export const register = mutation({
  args: { installationId: v.string(), platform: devicePlatform },
  handler: async (ctx, { installationId, platform }) => {
    const ownerId = await requireOwnerId(ctx.auth);

    if (await isAccountDeleted(ctx, ownerId)) {
      throw new ConvexError('This account is being deleted.');
    }

    const now = Date.now();
    const existing = await findDevice(ctx, ownerId, installationId);

    if (existing !== null) {
      if (existing.revokedAt !== undefined) {
        throw new ConvexError('This device was revoked.');
      }

      await ctx.db.patch(existing._id, { platform, lastSeenAt: now });

      return existing._id;
    }

    return ctx.db.insert('devices', {
      ownerId,
      installationId,
      platform,
      registeredAt: now,
      lastSeenAt: now,
    });
  },
});

export const standing = query({
  args: { installationId: v.string() },
  handler: async (ctx, { installationId }) => {
    const ownerId = await requireOwnerId(ctx.auth);

    if (await isAccountDeleted(ctx, ownerId)) {
      return 'accountDeleted' as const;
    }

    const device = await findDevice(ctx, ownerId, installationId);

    if (device === null) {
      return 'unregistered' as const;
    }

    return device.revokedAt === undefined ? ('active' as const) : ('revoked' as const);
  },
});

export const list = query({
  args: { installationId: v.string() },
  handler: async (ctx, { installationId }) => {
    const { ownerId, device: current } = await requireActiveDevice(ctx, installationId);
    const devices = await ctx.db
      .query('devices')
      .withIndex('by_owner', (index) => index.eq('ownerId', ownerId))
      .collect();

    return devices
      .filter((device) => device.revokedAt === undefined)
      .sort((left, right) => right.lastSeenAt - left.lastSeenAt)
      .map((device) => ({
        id: device._id,
        platform: device.platform,
        registeredAt: device.registeredAt,
        lastSeenAt: device.lastSeenAt,
        isCurrent: device._id === current._id,
      }));
  },
});

export const revoke = mutation({
  args: { installationId: v.string(), deviceId: v.id('devices') },
  handler: async (ctx, { installationId, deviceId }) => {
    const { ownerId, device: current } = await requireActiveDevice(ctx, installationId);
    const target = await ctx.db.get(deviceId);

    if (target === null || target.ownerId !== ownerId) {
      throw new ConvexError('This device does not belong to you.');
    }

    if (target._id === current._id) {
      throw new ConvexError('Sign out to stop using this device.');
    }

    if (target.revokedAt === undefined) {
      await ctx.db.patch(target._id, { revokedAt: Date.now() });
    }
  },
});
