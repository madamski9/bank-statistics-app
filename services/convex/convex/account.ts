import { mutation, type QueryCtx } from './_generated/server';
import { requireOwnerId } from './owner';

const deletionBatchSize = 500;
const ownedTables = ['transactions', 'financialAccounts', 'devices'] as const;

export async function isAccountDeleted(ctx: QueryCtx, ownerId: string): Promise<boolean> {
  const deletion = await ctx.db
    .query('accountDeletions')
    .withIndex('by_owner', (index) => index.eq('ownerId', ownerId))
    .first();

  return deletion !== null;
}

export const deleteData = mutation({
  args: {},
  handler: async (ctx) => {
    const ownerId = await requireOwnerId(ctx.auth);

    if (!(await isAccountDeleted(ctx, ownerId))) {
      await ctx.db.insert('accountDeletions', { ownerId, requestedAt: Date.now() });
    }

    let isComplete = true;

    for (const table of ownedTables) {
      const rows = await ctx.db
        .query(table)
        .withIndex('by_owner', (index) => index.eq('ownerId', ownerId))
        .take(deletionBatchSize);

      await Promise.all(rows.map((row) => ctx.db.delete(row._id)));
      isComplete &&= rows.length < deletionBatchSize;
    }

    return { isComplete };
  },
});
