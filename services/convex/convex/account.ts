import { mutation, type MutationCtx } from './_generated/server';
import { requireTrustedSession } from './devices';
import { findOwner, saveOwner } from './owners';
import { syncedTables } from './sync';

const deletionBatchSize = 500;

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

export const deleteData = mutation({
  args: {},
  handler: async (ctx) => {
    const { ownerId } = await requireTrustedSession(ctx);
    const owner = await findOwner(ctx, ownerId);
    const now = Date.now();

    if (owner?.deletionRequestedAt === undefined) {
      await saveOwner(ctx, ownerId, owner, { deletionRequestedAt: now }, now);
    }

    const owned = await Promise.all([
      ctx.db
        .query('devices')
        .withIndex('by_owner_revoked', (index) => index.eq('ownerId', ownerId))
        .take(deletionBatchSize),
      ctx.db
        .query('profiles')
        .withIndex('by_owner', (index) => index.eq('ownerId', ownerId))
        .take(deletionBatchSize),
    ]);
    const rows = owned.flat();

    await Promise.all(rows.map((row) => ctx.db.delete(row._id)));
    const isComplete = (await deleteSyncedRows(ctx, ownerId)) && owned.every((batch) => batch.length < deletionBatchSize);

    return { isComplete };
  },
});

export const deleteCloudCopy = mutation({
  args: {},
  handler: async (ctx) => {
    const { ownerId } = await requireTrustedSession(ctx);

    return { isComplete: await deleteSyncedRows(ctx, ownerId) };
  },
});
