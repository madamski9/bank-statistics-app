import { ConvexError, v, type Infer } from 'convex/values';

import { internal } from './_generated/api';
import { internalMutation, mutation, query } from './_generated/server';
import { findDevice } from './devices';
import { requireOwnerId } from './owner';
import { transactionFields } from './schema';

const transactionChange = v.object({
  ...transactionFields,
  revision: v.number(),
  deleted: v.boolean(),
});

type TransactionChange = Infer<typeof transactionChange>;

const currencyPattern = /^[A-Z]{3}$/;
const tombstoneRetentionMs = 90 * 24 * 60 * 60 * 1000;
const purgeBatchSize = 500;

function assertValidChange(change: TransactionChange) {
  if (change.origin !== 'manual') {
    throw new ConvexError('Only manual transactions synchronize for now.');
  }

  if (!Number.isSafeInteger(change.amountMinor) || change.amountMinor <= 0) {
    throw new ConvexError('An amount is a positive whole number of minor units.');
  }

  if (!currencyPattern.test(change.currency)) {
    throw new ConvexError('A currency is a three-letter ISO code.');
  }

  if (Number.isNaN(Date.parse(change.occurredAt)) || Number.isNaN(Date.parse(change.capturedAt))) {
    throw new ConvexError('Occurrence and capture times are ISO 8601 timestamps.');
  }

  if (!Number.isSafeInteger(change.revision) || change.revision < 0) {
    throw new ConvexError('A revision is a non-negative whole number.');
  }
}

export const push = mutation({
  args: { installationId: v.string(), changes: v.array(transactionChange) },
  handler: async (ctx, { installationId, changes }) => {
    const ownerId = await requireOwnerId(ctx.auth);
    const device = await findDevice(ctx, ownerId, installationId);

    if (device === null) {
      throw new ConvexError('Register this device before synchronizing.');
    }

    changes.forEach(assertValidChange);
    const now = Date.now();

    for (const change of changes) {
      const stored = await ctx.db
        .query('transactions')
        .withIndex('by_owner_client', (index) =>
          index.eq('ownerId', ownerId).eq('clientId', change.clientId),
        )
        .unique();

      const row = {
        ...change,
        ownerId,
        lastDeviceId: device._id,
        deletedAt: change.deleted ? (stored?.deletedAt ?? now) : undefined,
      };

      if (stored === null) {
        await ctx.db.insert('transactions', row);
      } else if (change.revision > stored.revision) {
        await ctx.db.replace(stored._id, row);
      }
    }

    await ctx.db.patch(device._id, { lastSeenAt: now });
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const ownerId = await requireOwnerId(ctx.auth);
    const stored = await ctx.db
      .query('transactions')
      .withIndex('by_owner', (index) => index.eq('ownerId', ownerId))
      .collect();

    return stored.map(
      ({ _id, _creationTime, ownerId: _owner, lastDeviceId: _device, deletedAt: _deletedAt, ...change }) =>
        change,
    );
  },
});

export const purgeExpiredTombstones = internalMutation({
  args: {},
  handler: async (ctx) => {
    const expired = await ctx.db
      .query('transactions')
      .withIndex('by_deleted_at', (index) =>
        index.gt('deletedAt', 0).lt('deletedAt', Date.now() - tombstoneRetentionMs),
      )
      .take(purgeBatchSize);

    await Promise.all(expired.map((row) => ctx.db.delete(row._id)));

    if (expired.length === purgeBatchSize) {
      await ctx.scheduler.runAfter(0, internal.transactions.purgeExpiredTombstones, {});
    }
  },
});
