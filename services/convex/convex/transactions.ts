import { ConvexError, v, type Infer } from 'convex/values';

import { mutation, query } from './_generated/server';
import { findDevice, requireOwnerId } from './owner';
import { transactionFields } from './schema';

const transactionChange = v.object({
  ...transactionFields,
  revision: v.number(),
  deleted: v.boolean(),
});

type TransactionChange = Infer<typeof transactionChange>;

const currencyPattern = /^[A-Z]{3}$/;

function assertValidChange(change: TransactionChange) {
  if (!Number.isSafeInteger(change.amountMinor) || change.amountMinor <= 0) {
    throw new ConvexError('An amount is a positive whole number of minor units.');
  }

  if (!currencyPattern.test(change.currency)) {
    throw new ConvexError('A currency is a three-letter ISO code.');
  }

  if (Number.isNaN(Date.parse(change.occurredAt))) {
    throw new ConvexError('An occurrence time is an ISO 8601 timestamp.');
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

    for (const change of changes) {
      const stored = await ctx.db
        .query('transactions')
        .withIndex('by_owner_client', (index) =>
          index.eq('ownerId', ownerId).eq('clientId', change.clientId),
        )
        .unique();

      if (stored === null) {
        await ctx.db.insert('transactions', { ...change, ownerId, lastDeviceId: device._id });
      } else if (change.revision > stored.revision) {
        await ctx.db.replace(stored._id, { ...change, ownerId, lastDeviceId: device._id });
      }
    }

    await ctx.db.patch(device._id, { lastSeenAt: Date.now() });
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

    return stored.map(({ _id, _creationTime, ownerId: _owner, lastDeviceId: _device, ...change }) => change);
  },
});
