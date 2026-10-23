import { v } from 'convex/values';

import { internal } from './_generated/api';
import { action, internalAction, internalMutation, type ActionCtx, type MutationCtx } from './_generated/server';
import type { Id } from './_generated/dataModel';
import { requireOwnerId } from './owner';
import { findOwner } from './owners';
import { findProfile } from './profiles';
import {
  fetchRevenueCatCustomer,
  storeSubscriptionFields,
  storeSubscriptionFrom,
  type StoreSubscription,
} from './revenueCat';

const recheckDelayAfterExpiryMs = 60 * 1000;
const recheckRetryMs = 15 * 60 * 1000;

async function syncOwner(ctx: ActionCtx, ownerId: string): Promise<StoreSubscription> {
  const secretKey = process.env.REVENUECAT_SECRET_API_KEY;

  if (secretKey === undefined || secretKey === '') {
    throw new Error('REVENUECAT_SECRET_API_KEY is not configured, so store purchases cannot be checked.');
  }

  const customer = await fetchRevenueCatCustomer(ownerId, secretKey);
  const subscription = storeSubscriptionFrom(customer, Date.now(), process.env.REVENUECAT_ACCEPTS_SANDBOX === 'true');
  await ctx.runMutation(internal.storeSubscriptions.apply, { ownerId, subscription });

  return subscription;
}

export async function syncStoreSubscriptions(ctx: ActionCtx, ownerIds: string[]): Promise<void> {
  await Promise.all(ownerIds.map((ownerId) => syncOwner(ctx, ownerId)));
}

async function cancelPendingRecheck(ctx: MutationCtx, recheckId: Id<'_scheduled_functions'> | undefined) {
  if (recheckId === undefined) {
    return;
  }

  const recheck = await ctx.db.system.get(recheckId);

  if (recheck?.state.kind === 'pending') {
    await ctx.scheduler.cancel(recheckId);
  }
}

export const apply = internalMutation({
  args: { ownerId: v.string(), subscription: storeSubscriptionFields },
  handler: async (ctx, { ownerId, subscription }) => {
    const owner = await findOwner(ctx, ownerId);

    if (owner?.deletionRequestedAt !== undefined) {
      return;
    }

    const profile = await findProfile(ctx, ownerId);

    if (profile?.storeSubscription !== undefined && profile.storeSubscription.checkedAt >= subscription.checkedAt) {
      return;
    }

    await cancelPendingRecheck(ctx, profile?.storeSubscriptionRecheck);
    const storeSubscriptionRecheck =
      subscription.isActive && subscription.accessUntil !== undefined
        ? await ctx.scheduler.runAt(subscription.accessUntil + recheckDelayAfterExpiryMs, internal.storeSubscriptions.recheck, {
            ownerId,
          })
        : undefined;

    if (profile === null) {
      await ctx.db.insert('profiles', { ownerId, isPremium: false, storeSubscription: subscription, storeSubscriptionRecheck });
      return;
    }

    await ctx.db.patch(profile._id, { storeSubscription: subscription, storeSubscriptionRecheck });
  },
});

export const recheck = internalAction({
  args: { ownerId: v.string() },
  handler: async (ctx, { ownerId }) => {
    try {
      await syncOwner(ctx, ownerId);
    } catch (error) {
      console.error(error);
      await ctx.scheduler.runAfter(recheckRetryMs, internal.storeSubscriptions.recheck, { ownerId });
    }
  },
});

export const refresh = action({
  args: {},
  handler: async (ctx): Promise<{ isActive: boolean }> => {
    const ownerId = await requireOwnerId(ctx.auth);
    const subscription = await syncOwner(ctx, ownerId);

    return { isActive: subscription.isActive };
  },
});
