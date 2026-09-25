import { ConvexError } from 'convex/values';

import { internal } from './_generated/api';
import type { Doc } from './_generated/dataModel';
import { internalMutation, type QueryCtx } from './_generated/server';
import { requireActiveDevice } from './devices';

type SyncedTable = 'transactions' | 'financialAccounts';

interface SyncedChange {
  clientId: string;
  revision: number;
  deleted: boolean;
}

const syncedTables: SyncedTable[] = ['transactions', 'financialAccounts'];
const tombstoneRetentionMs = 90 * 24 * 60 * 60 * 1000;
const purgeBatchSize = 500;

export function assertValidRevision(change: SyncedChange) {
  if (!Number.isSafeInteger(change.revision) || change.revision < 0) {
    throw new ConvexError('A revision is a non-negative whole number.');
  }
}

export function requireDevice(ctx: QueryCtx, installationId: string) {
  return requireActiveDevice(ctx, installationId);
}

interface StoredRow {
  revision: number;
  deletedAt?: number;
}

export function rowFromChange<Change extends SyncedChange>(
  change: Change,
  stored: StoredRow | null,
  owner: { ownerId: string; device: Doc<'devices'> },
  now: number,
) {
  if (stored !== null && change.revision <= stored.revision) {
    return null;
  }

  return {
    ...change,
    ownerId: owner.ownerId,
    lastDeviceId: owner.device._id,
    deletedAt: change.deleted ? (stored?.deletedAt ?? now) : undefined,
  };
}

interface ServerFields {
  _id: unknown;
  _creationTime: number;
  ownerId: string;
  lastDeviceId: unknown;
  deletedAt?: number;
}

export function withoutServerFields<Row extends ServerFields>(
  row: Row,
): Omit<Row, keyof ServerFields> {
  const { _id, _creationTime, ownerId: _owner, lastDeviceId: _device, deletedAt: _deletedAt, ...change } =
    row;

  return change;
}

export const purgeExpiredTombstones = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - tombstoneRetentionMs;
    let isBatchFull = false;

    for (const table of syncedTables) {
      const expired = await ctx.db
        .query(table)
        .withIndex('by_deleted_at', (index) => index.gt('deletedAt', 0).lt('deletedAt', cutoff))
        .take(purgeBatchSize);

      await Promise.all(expired.map((row) => ctx.db.delete(row._id)));
      isBatchFull ||= expired.length === purgeBatchSize;
    }

    if (isBatchFull) {
      await ctx.scheduler.runAfter(0, internal.syncedRows.purgeExpiredTombstones, {});
    }
  },
});
