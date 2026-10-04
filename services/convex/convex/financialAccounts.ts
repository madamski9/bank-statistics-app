import { ConvexError, v, type Infer } from 'convex/values';

import { mutation, query } from './_generated/server';
import { financialAccountChangeProblem } from './changeRules';
import { financialAccountFields } from './schema';
import {
  assertPushSize,
  requireDevice,
  storeChanges,
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
    await storeChanges(ctx, 'financialAccounts', owner, changes);
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
