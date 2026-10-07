import { v } from 'convex/values';

import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { internalMutation, type MutationCtx } from './_generated/server';
import { findOwner, saveOwner } from './owners';
import { syncedTables, type SyncedTable } from './sync';

const migrationBatchSize = 100;
const migrationSteps = [...syncedTables, 'devices', 'accountDeletions'] as const;

type MigrationStep = (typeof migrationSteps)[number];

interface LegacySyncedRow {
  _id: Id<SyncedTable>;
  _creationTime: number;
  ownerId: string;
  clientId: string;
  revision: number;
  deleted: boolean;
  deletedAt?: number;
  sequence?: number;
  lastDeviceId?: string;
  [field: string]: unknown;
}

interface LegacyDevice {
  _id: Id<'devices'>;
  sessionId?: string;
}

interface LegacyAccountDeletion {
  _id: string;
  ownerId: string;
  requestedAt: number;
}

async function nextSequence(ctx: MutationCtx, ownerId: string, now: number): Promise<number> {
  const owner = await findOwner(ctx, ownerId);
  const sequence = (owner?.sequence ?? 0) + 1;
  await saveOwner(ctx, ownerId, owner, { sequence }, now);

  return sequence;
}

async function migrateSyncedRow(ctx: MutationCtx, row: LegacySyncedRow, now: number): Promise<void> {
  if (row.sequence !== undefined && row.lastDeviceId === undefined && !row.deleted) {
    return;
  }

  const sequence = row.sequence ?? (await nextSequence(ctx, row.ownerId, now));

  if (row.deleted) {
    await ctx.db.replace(row._id, {
      ownerId: row.ownerId,
      clientId: row.clientId,
      revision: row.revision,
      sequence,
      deleted: true,
      deletedAt: row.deletedAt ?? now,
    } as never);
    return;
  }

  const { _id, _creationTime, lastDeviceId: _device, deletedAt: _deletedAt, ...content } = row;
  await ctx.db.replace(row._id, { ...content, sequence, deleted: false } as never);
}

async function migrateDevice(ctx: MutationCtx, device: LegacyDevice): Promise<void> {
  if (device.sessionId === undefined) {
    await ctx.db.patch(device._id, { sessionId: `legacy-${device._id}` });
  }
}

async function migrateAccountDeletion(
  ctx: MutationCtx,
  marker: LegacyAccountDeletion,
  now: number,
): Promise<void> {
  const owner = await findOwner(ctx, marker.ownerId);

  if (owner?.deletionRequestedAt === undefined) {
    await saveOwner(ctx, marker.ownerId, owner, { deletionRequestedAt: marker.requestedAt }, now);
  }

  await ctx.db.delete(marker._id as never);
}

async function migrateDocument(ctx: MutationCtx, step: MigrationStep, document: unknown, now: number) {
  if (step === 'devices') {
    return migrateDevice(ctx, document as LegacyDevice);
  }

  if (step === 'accountDeletions') {
    return migrateAccountDeletion(ctx, document as LegacyAccountDeletion, now);
  }

  return migrateSyncedRow(ctx, document as LegacySyncedRow, now);
}

export const migrateToIncrementalSync = internalMutation({
  args: { step: v.optional(v.number()), cursor: v.optional(v.union(v.string(), v.null())) },
  handler: async (ctx, { step = 0, cursor = null }) => {
    const table = migrationSteps[step];

    if (table === undefined) {
      return { isDone: true };
    }

    const now = Date.now();
    const page = await ctx.db
      .query(table as SyncedTable)
      .paginate({ cursor, numItems: migrationBatchSize });

    for (const document of page.page) {
      await migrateDocument(ctx, table, document, now);
    }

    const next = page.isDone ? { step: step + 1, cursor: null } : { step, cursor: page.continueCursor };
    await ctx.scheduler.runAfter(0, internal.migrations.migrateToIncrementalSync, next);

    return { isDone: false };
  },
});
