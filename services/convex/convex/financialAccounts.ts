import { ConvexError, v, type Infer } from 'convex/values';

import { mutation, query } from './_generated/server';
import { financialAccountChangeProblem } from './changeRules';
import { financialAccountFields } from './schema';
import {
  assertPushSize,
  requireDevice,
  rowFromChange,
  withoutServerFields,
} from './syncedRows';

const financialAccountChange = v.object({
  ...financialAccountFields,
  revision: v.number(),
  deleted: v.boolean(),
});

type FinancialAccountChange = Infer<typeof financialAccountChange>;

function assertValidChange(change: FinancialAccountChange) {
  const problem = financialAccountChangeProblem(change);

  if (problem !== null) {
    throw new ConvexError(problem);
  }
}

export const push = mutation({
  args: { installationId: v.string(), changes: v.array(financialAccountChange) },
  handler: async (ctx, { installationId, changes }) => {
    const owner = await requireDevice(ctx, installationId);
    assertPushSize(changes);
    changes.forEach(assertValidChange);
    const now = Date.now();

    for (const change of changes) {
      const stored = await ctx.db
        .query('financialAccounts')
        .withIndex('by_owner_client', (index) =>
          index.eq('ownerId', owner.ownerId).eq('clientId', change.clientId),
        )
        .unique();
      const row = rowFromChange(change, stored, owner, now);

      if (row === null) {
        continue;
      }

      if (stored === null) {
        await ctx.db.insert('financialAccounts', row);
      } else {
        await ctx.db.replace(stored._id, row);
      }
    }

    await ctx.db.patch(owner.device._id, { lastSeenAt: now });
  },
});

export const list = query({
  args: { installationId: v.string() },
  handler: async (ctx, { installationId }) => {
    const { ownerId } = await requireDevice(ctx, installationId);
    const rows = await ctx.db
      .query('financialAccounts')
      .withIndex('by_owner', (index) => index.eq('ownerId', ownerId))
      .collect();

    return rows.map(withoutServerFields);
  },
});
