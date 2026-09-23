import { v } from 'convex/values';

import { mutation } from './_generated/server';
import { findDevice, requireOwnerId } from './owner';
import { devicePlatform } from './schema';

export const register = mutation({
  args: { installationId: v.string(), platform: devicePlatform },
  handler: async (ctx, { installationId, platform }) => {
    const ownerId = await requireOwnerId(ctx.auth);
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
