import { v } from 'convex/values';

import { internalMutation, query, type QueryCtx } from './_generated/server';
import { requireOwnerId } from './owner';

export function findProfile(ctx: QueryCtx, ownerId: string) {
  return ctx.db
    .query('profiles')
    .withIndex('by_owner', (index) => index.eq('ownerId', ownerId))
    .first();
}

export const current = query({
  args: {},
  handler: async (ctx) => {
    const ownerId = await requireOwnerId(ctx.auth);
    const profile = await findProfile(ctx, ownerId);
    const storeSubscription = profile?.storeSubscription?.isActive === true ? profile.storeSubscription : null;

    return {
      isPremium: profile?.isPremium === true || storeSubscription !== null,
      premiumSince: profile?.premiumSince ?? null,
      premiumUntil: profile?.premiumUntil ?? null,
      subscription:
        storeSubscription === null
          ? null
          : {
              accessUntil: storeSubscription.accessUntil ?? null,
              willRenew: storeSubscription.willRenew,
              isTrial: storeSubscription.isTrial,
              hasBillingIssue: storeSubscription.hasBillingIssue,
              managementUrl: storeSubscription.managementUrl ?? null,
            },
    };
  },
});

export const setPremium = internalMutation({
  args: { ownerId: v.string(), isPremium: v.boolean() },
  handler: async (ctx, { ownerId, isPremium }) => {
    const profile = await findProfile(ctx, ownerId);
    const premiumSince = isPremium ? (profile?.premiumSince ?? Date.now()) : undefined;

    if (profile === null) {
      await ctx.db.insert('profiles', { ownerId, isPremium, premiumSince });
      return;
    }

    await ctx.db.patch(profile._id, { isPremium, premiumSince, premiumUntil: undefined });
  },
});
