import { ConvexError } from 'convex/values';

import { internal } from './_generated/api';
import type { Doc } from './_generated/dataModel';
import { internalMutation, type MutationCtx, type QueryCtx } from './_generated/server';
import { maximumChangesPerPush, textProblem } from './changeRules';
import { requireActiveDevice } from './devices';

type SyncedTable = 'transactions' | 'financialAccounts' | 'categories' | 'events';

interface SyncedChange {
  clientId: string;
  revision: number;
  deleted: boolean;
}

export const syncedTables: SyncedTable[] = ['transactions', 'financialAccounts', 'categories', 'events'];
const tombstoneRetentionMs = 90 * 24 * 60 * 60 * 1000;
const purgeBatchSize = 500;
const isoTimestampPattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/;

export function isIsoTimestamp(value: string): boolean {
  return isoTimestampPattern.test(value) && !Number.isNaN(Date.parse(value));
}

export function assertPushSize(changes: unknown[]) {
  if (changes.length > maximumChangesPerPush) {
    throw new ConvexError(`A push carries at most ${maximumChangesPerPush} changes.`);
  }
}

export function assertBoundedText(value: string | undefined) {
  const problem = textProblem(value);

  if (problem !== null) {
    throw new ConvexError(problem);
  }
}

export function requireDevice(ctx: QueryCtx, installationId: string) {
  assertBoundedText(installationId);
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

type SyncOwner = { ownerId: string; device: Doc<'devices'> };

export async function storeChanges<Change extends SyncedChange>(
  ctx: MutationCtx,
  table: SyncedTable,
  owner: SyncOwner,
  changes: Change[],
) {
  const now = Date.now();

  for (const change of changes) {
    const stored = await ctx.db
      .query(table)
      .withIndex('by_owner_client', (index) =>
        index.eq('ownerId', owner.ownerId).eq('clientId', change.clientId),
      )
      .unique();
    const row = rowFromChange(change, stored, owner, now);

    if (row === null) {
      continue;
    }

    if (stored === null) {
      await ctx.db.insert(table, row as never);
    } else {
      await ctx.db.replace(stored._id, row as never);
    }
  }

  await ctx.db.patch(owner.device._id, { lastSeenAt: now });
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
