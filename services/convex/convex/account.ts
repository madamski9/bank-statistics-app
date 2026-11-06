import { v } from 'convex/values';

import { internal } from './_generated/api';
import { action, internalAction, internalMutation, mutation, type MutationCtx } from './_generated/server';
import { requireTrustedSession } from './devices';
import { identityCheckRequiredError, requireSignedIn } from './owner';
import { findOwner, saveOwner } from './owners';
import { deleteRevenueCatCustomer } from './revenueCat';
import { fetchSigningKeys, isRecentlyVerifiedSession } from './sessionToken';
import { syncedTables } from './sync';

const deletionBatchSize = 500;
const clerkUserRemovalDelayMs = 60 * 60 * 1000;
const clerkApiUrl = 'https://api.clerk.com/v1';
const revenueCatRemovalAttempts = 12;
const revenueCatRetryBaseMs = 60 * 1000;
const revenueCatSweepDays = 90;
const dayMs = 24 * 60 * 60 * 1000;
const revenueCatSweepBatchSize = 200;
const revenueCatSecondRemovalDelayMs = clerkUserRemovalDelayMs + 10 * 60 * 1000;

async function deleteSyncedRows(ctx: MutationCtx, ownerId: string): Promise<boolean> {
  let isComplete = true;

  for (const table of syncedTables) {
    const rows = await ctx.db
      .query(table)
      .withIndex('by_owner_sequence', (index) => index.eq('ownerId', ownerId))
      .take(deletionBatchSize);

    await Promise.all(rows.map((row) => ctx.db.delete(row._id)));
    isComplete &&= rows.length < deletionBatchSize;
  }

  return isComplete;
}

async function deleteOwnedRows(ctx: MutationCtx, ownerId: string): Promise<boolean> {
  const owned = await Promise.all([
    ctx.db
      .query('devices')
      .withIndex('by_owner_revoked', (index) => index.eq('ownerId', ownerId))
      .take(deletionBatchSize),
    ctx.db
      .query('diagnosticSamples')
      .withIndex('by_owner_submitted', (index) => index.eq('ownerId', ownerId))
      .take(deletionBatchSize),
    ctx.db
      .query('profiles')
      .withIndex('by_owner', (index) => index.eq('ownerId', ownerId))
      .take(deletionBatchSize),
  ]);

  await Promise.all(owned.flat().map((row) => ctx.db.delete(row._id)));
  const isSyncedComplete = await deleteSyncedRows(ctx, ownerId);

  return isSyncedComplete && owned.every((batch) => batch.length < deletionBatchSize);
}

interface PurgeRequest {
  ownerId: string;
  removeClerkUser: boolean;
}

async function purgeBatch(ctx: MutationCtx, request: PurgeRequest): Promise<boolean> {
  const isComplete = await deleteOwnedRows(ctx, request.ownerId);

  if (!isComplete) {
    return false;
  }

  const owner = await findOwner(ctx, request.ownerId);

  if (owner !== null && owner.dataPurgedAt === undefined) {
    const now = Date.now();
    await saveOwner(ctx, request.ownerId, owner, { dataPurgedAt: now }, now);
    await ctx.scheduler.runAfter(0, internal.account.removeRevenueCatCustomer, {
      ownerId: request.ownerId,
      attempt: 1,
    });
    await ctx.scheduler.runAfter(revenueCatSecondRemovalDelayMs, internal.account.removeRevenueCatCustomer, {
      ownerId: request.ownerId,
      attempt: 1,
    });

    if (request.removeClerkUser) {
      await ctx.scheduler.runAfter(clerkUserRemovalDelayMs, internal.account.removeClerkUser, {
        ownerId: request.ownerId,
      });
    }
  }

  return true;
}

async function requestDeletion(ctx: MutationCtx, request: PurgeRequest): Promise<boolean> {
  const owner = await findOwner(ctx, request.ownerId);

  if (owner?.deletionRequestedAt !== undefined) {
    return false;
  }

  const now = Date.now();
  await saveOwner(ctx, request.ownerId, owner, { deletionRequestedAt: now }, now);
  await ctx.scheduler.runAfter(0, internal.account.purgeOwner, request);

  return true;
}

interface DeletionProgress {
  isComplete: boolean;
}

export const startDeletion = action({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }): Promise<DeletionProgress> => {
    const owner = await requireSignedIn(ctx.auth);
    const issuer = process.env.CLERK_JWT_ISSUER_DOMAIN;

    if (issuer === undefined || issuer === '') {
      throw new Error('CLERK_JWT_ISSUER_DOMAIN is not configured.');
    }

    const keys = await fetchSigningKeys(issuer);
    const isVerified = await isRecentlyVerifiedSession({ token: sessionToken, keys, issuer, owner, now: Date.now() });

    if (!isVerified) {
      throw identityCheckRequiredError();
    }

    return await ctx.runMutation(internal.account.beginDeletion, {});
  },
});

export const beginDeletion = internalMutation({
  args: {},
  handler: async (ctx): Promise<DeletionProgress> => {
    const { ownerId } = await requireTrustedSession(ctx);
    const request = { ownerId, removeClerkUser: true };
    await requestDeletion(ctx, request);

    return { isComplete: await purgeBatch(ctx, request) };
  },
});

export const deleteData = mutation({
  args: {},
  handler: async (ctx): Promise<DeletionProgress> => {
    const { ownerId } = await requireTrustedSession(ctx);
    const owner = await findOwner(ctx, ownerId);

    if (owner?.deletionRequestedAt === undefined) {
      throw identityCheckRequiredError();
    }

    return { isComplete: await purgeBatch(ctx, { ownerId, removeClerkUser: true }) };
  },
});

export const deleteCloudCopy = mutation({
  args: {},
  handler: async (ctx) => {
    const { ownerId } = await requireTrustedSession(ctx);

    return { isComplete: await deleteSyncedRows(ctx, ownerId) };
  },
});

export const purgeOwner = internalMutation({
  args: { ownerId: v.string(), removeClerkUser: v.boolean() },
  handler: async (ctx, request) => {
    if (!(await purgeBatch(ctx, request))) {
      await ctx.scheduler.runAfter(0, internal.account.purgeOwner, request);
    }
  },
});

export const forgetDeletedUser = internalMutation({
  args: { ownerId: v.string() },
  handler: async (ctx, { ownerId }) => {
    await requestDeletion(ctx, { ownerId, removeClerkUser: false });
  },
});

export const removeClerkUser = internalAction({
  args: { ownerId: v.string() },
  handler: async (_ctx, { ownerId }) => {
    const secretKey = process.env.CLERK_SECRET_KEY;

    if (secretKey === undefined || secretKey === '') {
      throw new Error('CLERK_SECRET_KEY is not configured, so the deleted account stays in Clerk.');
    }

    const response = await fetch(`${clerkApiUrl}/users/${encodeURIComponent(ownerId)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${secretKey}` },
    });

    if (!response.ok && response.status !== 404) {
      throw new Error(`Clerk refused to delete the user with status ${response.status}.`);
    }
  },
});

export const removeRevenueCatCustomer = internalAction({
  args: { ownerId: v.string(), attempt: v.number() },
  handler: async (ctx, { ownerId, attempt }) => {
    try {
      const secretKey = process.env.REVENUECAT_SECRET_API_KEY;

      if (secretKey === undefined || secretKey === '') {
        throw new Error('REVENUECAT_SECRET_API_KEY is not configured, so the deleted customer stays in RevenueCat.');
      }

      await deleteRevenueCatCustomer(ownerId, secretKey);
    } catch (error) {
      if (attempt >= revenueCatRemovalAttempts) {
        throw error;
      }

      await ctx.scheduler.runAfter(revenueCatRetryBaseMs * 2 ** (attempt - 1), internal.account.removeRevenueCatCustomer, {
        ownerId,
        attempt: attempt + 1,
      });
    }
  },
});

export const sweepRevenueCatCustomers = internalMutation({
  args: {
    scope: v.union(v.literal('recent'), v.literal('older')),
    since: v.optional(v.number()),
    cursor: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, { scope, since: continuedSince, cursor }) => {
    const since = continuedSince ?? Date.now() - revenueCatSweepDays * dayMs;
    const page = await ctx.db
      .query('owners')
      .withIndex('by_data_purged', (index) =>
        scope === 'recent' ? index.gte('dataPurgedAt', since) : index.gte('dataPurgedAt', 0).lt('dataPurgedAt', since),
      )
      .paginate({ cursor: cursor ?? null, numItems: revenueCatSweepBatchSize });

    await Promise.all(
      page.page.map((owner, position) =>
        ctx.scheduler.runAfter(position * 1000, internal.account.removeRevenueCatCustomer, {
          ownerId: owner.ownerId,
          attempt: revenueCatRemovalAttempts,
        }),
      ),
    );

    if (!page.isDone) {
      await ctx.scheduler.runAfter(page.page.length * 1000, internal.account.sweepRevenueCatCustomers, {
        scope,
        since,
        cursor: page.continueCursor,
      });
    }
  },
});
