import { v } from 'convex/values';

import type { Doc } from './_generated/dataModel';
import { internalMutation, query, type MutationCtx, type QueryCtx } from './_generated/server';
import { requireOwnerId } from './owner';

export interface AllowancePolicy {
  capacity: number;
  refillPerHour: number;
}

export interface Allowance {
  available: number;
  updatedAt: number;
}

export const pushAllowancePolicy: AllowancePolicy = { capacity: 20_000, refillPerHour: 20_000 };
export const rateLookupAllowancePolicy: AllowancePolicy = { capacity: 200, refillPerHour: 200 };

const hourMs = 60 * 60 * 1000;

type OwnerFields = Omit<Doc<'owners'>, '_id' | '_creationTime'>;

export function refilledAllowance(allowance: Allowance, policy: AllowancePolicy, now: number): number {
  const elapsed = Math.max(0, now - allowance.updatedAt);

  return Math.min(policy.capacity, allowance.available + (elapsed * policy.refillPerHour) / hourMs);
}

export function findOwner(ctx: QueryCtx, ownerId: string): Promise<Doc<'owners'> | null> {
  return ctx.db
    .query('owners')
    .withIndex('by_owner', (index) => index.eq('ownerId', ownerId))
    .unique();
}

export function isDeletionRequested(owner: Doc<'owners'> | null): boolean {
  return owner?.deletionRequestedAt !== undefined;
}

export function newOwner(ownerId: string, now: number): OwnerFields {
  return {
    ownerId,
    sequence: 0,
    pushAllowance: pushAllowancePolicy.capacity,
    pushAllowanceAt: now,
    rateLookupAllowance: rateLookupAllowancePolicy.capacity,
    rateLookupAllowanceAt: now,
  };
}

export async function saveOwner(
  ctx: MutationCtx,
  ownerId: string,
  stored: Doc<'owners'> | null,
  changes: Partial<OwnerFields>,
  now: number,
): Promise<void> {
  if (stored === null) {
    await ctx.db.insert('owners', { ...newOwner(ownerId, now), ...changes });
  } else {
    await ctx.db.patch(stored._id, changes);
  }
}

export const spendRateLookups = internalMutation({
  args: { ownerId: v.string(), requested: v.number() },
  handler: async (ctx, { ownerId, requested }) => {
    const now = Date.now();
    const stored = await findOwner(ctx, ownerId);

    if (isDeletionRequested(stored)) {
      return 0;
    }

    const owner = stored ?? newOwner(ownerId, now);
    const available = refilledAllowance(
      { available: owner.rateLookupAllowance, updatedAt: owner.rateLookupAllowanceAt },
      rateLookupAllowancePolicy,
      now,
    );
    const granted = Math.max(0, Math.min(requested, Math.floor(available)));

    if (granted > 0) {
      await saveOwner(
        ctx,
        ownerId,
        stored,
        { rateLookupAllowance: available - granted, rateLookupAllowanceAt: now },
        now,
      );
    }

    return granted;
  },
});

export const legacyOwnerId = query({
  args: {},
  handler: async (ctx): Promise<string | null> => {
    const owner = await findOwner(ctx, await requireOwnerId(ctx.auth));

    return owner?.legacyOwnerId ?? null;
  },
});
