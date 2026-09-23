import { ConvexError, v, type Infer } from 'convex/values';

import { mutation, query } from './_generated/server';
import { transactionFields } from './schema';
import { requireOwnerId } from './owner';
import { assertValidRevision, requireDevice, rowFromChange, withoutServerFields } from './syncedRows';

const transactionChange = v.object({
  ...transactionFields,
  revision: v.number(),
  deleted: v.boolean(),
});

type TransactionChange = Infer<typeof transactionChange>;

const currencyPattern = /^[A-Z]{3}$/;

function assertValidChange(change: TransactionChange) {
  if (change.origin !== 'manual') {
    throw new ConvexError('Only manual transactions synchronize for now.');
  }

  if (change.accountId === undefined || change.accountId.trim() === '') {
    throw new ConvexError('A manual transaction belongs to a Financial Account.');
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

  assertValidRevision(change);
}

export const push = mutation({
  args: { installationId: v.string(), changes: v.array(transactionChange) },
  handler: async (ctx, { installationId, changes }) => {
    changes.forEach(assertValidChange);
    const owner = await requireDevice(ctx, installationId);
    const now = Date.now();

    for (const change of changes) {
      const stored = await ctx.db
        .query('transactions')
        .withIndex('by_owner_client', (index) =>
          index.eq('ownerId', owner.ownerId).eq('clientId', change.clientId),
        )
        .unique();
      const row = rowFromChange(change, stored, owner, now);

      if (row === null) {
        continue;
      }

      if (stored === null) {
        await ctx.db.insert('transactions', row);
      } else {
        await ctx.db.replace(stored._id, row);
      }
    }

    await ctx.db.patch(owner.device._id, { lastSeenAt: now });
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const ownerId = await requireOwnerId(ctx.auth);
    const rows = await ctx.db
      .query('transactions')
      .withIndex('by_owner', (index) => index.eq('ownerId', ownerId))
      .collect();

    return rows.map(withoutServerFields);
  },
});
