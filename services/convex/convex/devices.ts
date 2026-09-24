import { v } from 'convex/values';

import type { Doc } from './_generated/dataModel';
import { mutation, type QueryCtx } from './_generated/server';
import { requireOwnerId } from './owner';
import { assertBoundedText } from './syncedRows';
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

export const register = mutation({
  args: { installationId: v.string(), platform: devicePlatform },
  handler: async (ctx, { installationId, platform }) => {
    const ownerId = await requireOwnerId(ctx.auth);
    assertBoundedText(installationId);
    const now = Date.now();
    const existing = await findDevice(ctx, ownerId, installationId);

    if (existing !== null) {
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
