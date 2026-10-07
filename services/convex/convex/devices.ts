import { ConvexError, v } from 'convex/values';

import { internal } from './_generated/api';
import type { Doc } from './_generated/dataModel';
import { internalAction, mutation, query, type QueryCtx } from './_generated/server';
import { textProblem } from './changeRules';
import { findOwner, isDeletionRequested } from './owners';
import { requireSignedIn, type SignedInOwner } from './owner';
import { devicePlatform } from './schema';

export const maximumActiveDevices = 2;
const lastSeenPrecisionMs = 60 * 60 * 1000;
const clerkApiUrl = 'https://api.clerk.com/v1';

export function assertBoundedText(value: string | undefined) {
  const problem = textProblem(value);

  if (problem !== null) {
    throw new ConvexError(problem);
  }
}

export function isLastSeenStale(device: Doc<'devices'>, now: number): boolean {
  return now - device.lastSeenAt >= lastSeenPrecisionMs;
}

function findDevice(ctx: QueryCtx, ownerId: string, installationId: string) {
  return ctx.db
    .query('devices')
    .withIndex('by_owner_installation', (index) =>
      index.eq('ownerId', ownerId).eq('installationId', installationId),
    )
    .unique();
}

async function isSessionRevoked(ctx: QueryCtx, sessionId: string): Promise<boolean> {
  const revoked = await ctx.db
    .query('devices')
    .withIndex('by_session_revoked', (index) => index.eq('sessionId', sessionId).gt('revokedAt', 0))
    .first();

  return revoked !== null;
}

export async function requireTrustedSession(ctx: QueryCtx): Promise<SignedInOwner> {
  const signedIn = await requireSignedIn(ctx.auth);

  if (await isSessionRevoked(ctx, signedIn.sessionId)) {
    throw new ConvexError('This device was revoked.');
  }

  return signedIn;
}

function activeDevices(ctx: QueryCtx, ownerId: string) {
  return ctx.db
    .query('devices')
    .withIndex('by_owner_revoked', (index) => index.eq('ownerId', ownerId).eq('revokedAt', undefined));
}

type DeviceStanding = 'active' | 'revoked' | 'unregistered' | 'staleSession';

function standingOf(device: Doc<'devices'> | null, sessionId: string): DeviceStanding {
  if (device === null) {
    return 'unregistered';
  }

  if (device.revokedAt !== undefined) {
    return 'revoked';
  }

  return device.sessionId === sessionId ? 'active' : 'staleSession';
}

type FoundDevice =
  | { ownerId: string; device: Doc<'devices'> }
  | { ownerId: string; standing: Exclude<DeviceStanding, 'active'> };

export async function findActiveDevice(ctx: QueryCtx, installationId: string): Promise<FoundDevice> {
  const { ownerId, sessionId } = await requireSignedIn(ctx.auth);
  assertBoundedText(installationId);
  const device = await findDevice(ctx, ownerId, installationId);
  const standing = standingOf(device, sessionId);

  if (standing === 'active' && device !== null) {
    return { ownerId, device };
  }

  return { ownerId, standing: standing === 'active' ? 'unregistered' : standing };
}

export async function requireActiveDevice(ctx: QueryCtx, installationId: string) {
  const found = await findActiveDevice(ctx, installationId);

  if ('device' in found) {
    return found;
  }

  if (found.standing === 'revoked') {
    throw new ConvexError('This device was revoked.');
  }

  throw new ConvexError('Register this device before synchronizing.');
}

export const register = mutation({
  args: { installationId: v.string(), platform: devicePlatform },
  handler: async (ctx, { installationId, platform }) => {
    const { ownerId, sessionId } = await requireSignedIn(ctx.auth);
    assertBoundedText(installationId);

    if (isDeletionRequested(await findOwner(ctx, ownerId))) {
      throw new ConvexError('This account is being deleted.');
    }

    const now = Date.now();
    const existing = await findDevice(ctx, ownerId, installationId);

    if (existing !== null) {
      if (existing.revokedAt !== undefined) {
        throw new ConvexError('This device was revoked.');
      }

      if (existing.sessionId !== sessionId || existing.platform !== platform || isLastSeenStale(existing, now)) {
        await ctx.db.patch(existing._id, { sessionId, platform, lastSeenAt: now });
      }

      return existing._id;
    }

    if (await isSessionRevoked(ctx, sessionId)) {
      throw new ConvexError('This device was revoked.');
    }

    const active = await activeDevices(ctx, ownerId).take(maximumActiveDevices);

    if (active.length >= maximumActiveDevices) {
      throw new ConvexError(`Remove one of your ${maximumActiveDevices} devices to add another.`);
    }

    return ctx.db.insert('devices', {
      ownerId,
      installationId,
      sessionId,
      platform,
      registeredAt: now,
      lastSeenAt: now,
    });
  },
});

export const standing = query({
  args: { installationId: v.string() },
  handler: async (ctx, { installationId }) => {
    const found = await findActiveDevice(ctx, installationId);

    if (isDeletionRequested(await findOwner(ctx, found.ownerId))) {
      return 'accountDeleted' as const;
    }

    if ('device' in found) {
      return 'active' as const;
    }

    return found.standing === 'revoked' ? ('revoked' as const) : ('unregistered' as const);
  },
});

export const list = query({
  args: { installationId: v.string() },
  handler: async (ctx, { installationId }) => {
    const { ownerId, device: current } = await requireActiveDevice(ctx, installationId);
    const devices = await activeDevices(ctx, ownerId).take(maximumActiveDevices);

    return devices
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

    if (target._id === current._id || target.sessionId === current.sessionId) {
      throw new ConvexError('Sign out to stop using this device.');
    }

    if (target.revokedAt === undefined) {
      await ctx.db.patch(target._id, { revokedAt: Date.now() });
      await ctx.scheduler.runAfter(0, internal.devices.endClerkSession, {
        sessionId: target.sessionId,
      });
    }
  },
});

export const endClerkSession = internalAction({
  args: { sessionId: v.string() },
  handler: async (_ctx, { sessionId }) => {
    const secretKey = process.env.CLERK_SECRET_KEY;

    if (secretKey === undefined || secretKey === '') {
      throw new Error('CLERK_SECRET_KEY is not configured, so the revoked session stays signed in.');
    }

    const response = await fetch(`${clerkApiUrl}/sessions/${encodeURIComponent(sessionId)}/revoke`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${secretKey}` },
    });

    if (!response.ok && response.status !== 404 && response.status !== 400) {
      throw new Error(`Clerk refused to revoke the session with status ${response.status}.`);
    }
  },
});
