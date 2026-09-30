import { ConvexError, v, type Infer } from 'convex/values';

import { mutation, query } from './_generated/server';
import { financialAccountFields } from './schema';
import {
  assertPushSize,
  assertValidRevision,
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

const maximumNameLength = 60;
const financialAccountBanks = new Set(['manual', 'millennium', 'pko']);

function assertValidChange(change: FinancialAccountChange) {
  const name = change.name.trim();

  if (name === '' || name.length > maximumNameLength) {
    throw new ConvexError(`An account name has between 1 and ${maximumNameLength} characters.`);
  }

  if (!financialAccountBanks.has(change.bank)) {
    throw new ConvexError('A Financial Account belongs to an enabled bank.');
  }

  assertValidRevision(change);
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
