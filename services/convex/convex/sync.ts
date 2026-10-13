import { ConvexError, v, type Infer, type PropertyValidators } from 'convex/values';

import { internal } from './_generated/api';
import type { Doc } from './_generated/dataModel';
import { internalMutation, mutation, query, type MutationCtx, type QueryCtx } from './_generated/server';
import {
  categoryChangeProblem,
  eventChangeProblem,
  financialAccountChangeProblem,
  maximumChangesPerPush,
  revisionProblem,
  transactionChangeProblem,
} from './changeRules';
import { findActiveDevice, isLastSeenStale, requireActiveDevice } from './devices';
import {
  findOwner,
  isDeletionRequested,
  pushAllowancePolicy,
  refilledAllowance,
  saveOwner,
} from './owners';
import { categoryFields, eventFields, financialAccountFields, transactionFields } from './schema';

export const syncedTables = ['financialAccounts', 'categories', 'events', 'transactions'] as const;

export type SyncedTable = (typeof syncedTables)[number];

export const pullPageSize = 500;
const tombstoneRetentionMs = 90 * 24 * 60 * 60 * 1000;
const purgeBatchSize = 500;
const generalAccountIds = new Set(['general-manual', 'general-millennium', 'general-pko', 'general-erste', 'general-ing']);

const tombstone = v.object({ clientId: v.string(), revision: v.number(), deleted: v.literal(true) });

function syncedChange<Fields extends PropertyValidators>(fields: Fields) {
  return { ...fields, revision: v.number(), deleted: v.boolean() };
}

const transactionChange = v.union(v.object(syncedChange(transactionFields)), tombstone);
const financialAccountChange = v.union(v.object(syncedChange(financialAccountFields)), tombstone);
const categoryChange = v.union(v.object(syncedChange(categoryFields)), tombstone);
const eventChange = v.union(v.object(syncedChange(eventFields)), tombstone);

export const transactionContent = v.object(transactionFields);
export const financialAccountContent = v.object(financialAccountFields);
export const categoryContent = v.object(categoryFields);
export const eventContent = v.object(eventFields);

export type TransactionContent = Infer<typeof transactionContent>;
export type FinancialAccountContent = Infer<typeof financialAccountContent>;
export type CategoryContent = Infer<typeof categoryContent>;
export type EventContent = Infer<typeof eventContent>;
export type Tombstone = Infer<typeof tombstone>;

interface PushedChanges {
  transactions: Infer<typeof transactionChange>[];
  financialAccounts: Infer<typeof financialAccountChange>[];
  categories: Infer<typeof categoryChange>[];
  events: Infer<typeof eventChange>[];
}

type AnyChange = PushedChanges[SyncedTable][number];

const contentProblems: { [Table in SyncedTable]: (change: PushedChanges[Table][number] & { deleted: false }) => string | null } = {
  transactions: transactionChangeProblem,
  financialAccounts: financialAccountChangeProblem,
  categories: categoryChangeProblem,
  events: eventChangeProblem,
};

function changeProblem<Table extends SyncedTable>(table: Table, change: PushedChanges[Table][number]): string | null {
  if (change.deleted) {
    return revisionProblem(change);
  }

  return contentProblems[table](change as PushedChanges[Table][number] & { deleted: false });
}

type StoredRow = Doc<SyncedTable>;

function findRow(ctx: QueryCtx, table: SyncedTable, ownerId: string, clientId: string) {
  return ctx.db
    .query(table)
    .withIndex('by_owner_client', (index) => index.eq('ownerId', ownerId).eq('clientId', clientId))
    .unique();
}

function storedRow(
  change: AnyChange,
  stored: StoredRow | null,
  ownerId: string,
  sequence: number,
  now: number,
) {
  if (change.deleted) {
    return {
      ownerId,
      clientId: change.clientId,
      revision: change.revision,
      sequence,
      deleted: true as const,
      deletedAt: stored?.deleted === true ? stored.deletedAt : now,
    };
  }

  return { ...change, ownerId, sequence, deleted: false as const };
}

type ContentRow<Row> = Extract<Row, { deleted: false }>;

type PulledChange<Row> = Omit<ContentRow<Row>, '_id' | '_creationTime' | 'ownerId' | 'sequence'> | Tombstone;

function pulledChange<Row extends StoredRow>(row: Row): PulledChange<Row> {
  if (row.deleted) {
    return { clientId: row.clientId, revision: row.revision, deleted: true };
  }

  const { _id, _creationTime, ownerId: _owner, sequence: _sequence, ...change } = row as ContentRow<Row>;

  return change;
}

async function assertOwnedAccounts(ctx: QueryCtx, ownerId: string, changes: PushedChanges['transactions']) {
  const accountIds = new Set(
    changes.flatMap((change) =>
      !change.deleted && change.accountId !== undefined && !generalAccountIds.has(change.accountId)
        ? [change.accountId]
        : [],
    ),
  );

  for (const accountId of accountIds) {
    const account = await findRow(ctx, 'financialAccounts', ownerId, accountId);

    if (account === null || account.deleted) {
      throw new ConvexError('A transaction belongs to one of your Financial Accounts.');
    }
  }
}

const cursors = v.object({
  transactions: v.number(),
  financialAccounts: v.number(),
  categories: v.number(),
  events: v.number(),
});

export const head = query({
  args: { installationId: v.string() },
  handler: async (ctx, { installationId }) => {
    const found = await findActiveDevice(ctx, installationId);

    if (!('device' in found)) {
      return null;
    }

    const owner = await findOwner(ctx, found.ownerId);

    return isDeletionRequested(owner) ? null : (owner?.sequence ?? 0);
  },
});

export const pull = query({
  args: { installationId: v.string(), cursors },
  handler: async (ctx, { installationId, cursors: from }) => {
    const { ownerId } = await requireActiveDevice(ctx, installationId);
    const owner = await findOwner(ctx, ownerId);

    if (isDeletionRequested(owner)) {
      throw new ConvexError('This account is being deleted.');
    }

    const page = (table: SyncedTable) =>
      ctx.db
        .query(table)
        .withIndex('by_owner_sequence', (index) => index.eq('ownerId', ownerId).gt('sequence', from[table]))
        .take(pullPageSize);
    const [financialAccounts, categories, events, transactions] = await Promise.all([
      page('financialAccounts') as Promise<Doc<'financialAccounts'>[]>,
      page('categories') as Promise<Doc<'categories'>[]>,
      page('events') as Promise<Doc<'events'>[]>,
      page('transactions') as Promise<Doc<'transactions'>[]>,
    ]);
    const pages = [financialAccounts, categories, events, transactions];

    return {
      head: owner?.sequence ?? 0,
      isComplete: pages.every((rows) => rows.length < pullPageSize),
      cursors: {
        financialAccounts: financialAccounts.at(-1)?.sequence ?? from.financialAccounts,
        categories: categories.at(-1)?.sequence ?? from.categories,
        events: events.at(-1)?.sequence ?? from.events,
        transactions: transactions.at(-1)?.sequence ?? from.transactions,
      },
      changes: {
        financialAccounts: financialAccounts.map(pulledChange),
        categories: categories.map(pulledChange),
        events: events.map(pulledChange),
        transactions: transactions.map(pulledChange),
      },
    };
  },
});

async function storeChanges(
  ctx: MutationCtx,
  table: SyncedTable,
  ownerId: string,
  changes: AnyChange[],
  sequence: number,
  now: number,
): Promise<number> {
  let next = sequence;

  for (const change of changes) {
    const stored = await findRow(ctx, table, ownerId, change.clientId);

    if (stored !== null && change.revision <= stored.revision) {
      continue;
    }

    next += 1;
    const row = storedRow(change, stored, ownerId, next, now);

    if (stored === null) {
      await ctx.db.insert(table, row as never);
    } else {
      await ctx.db.replace(stored._id, row as never);
    }
  }

  return next;
}

export const push = mutation({
  args: {
    installationId: v.string(),
    changes: v.object({
      transactions: v.optional(v.array(transactionChange)),
      financialAccounts: v.optional(v.array(financialAccountChange)),
      categories: v.optional(v.array(categoryChange)),
      events: v.optional(v.array(eventChange)),
    }),
  },
  handler: async (ctx, { installationId, changes }) => {
    const { ownerId, device } = await requireActiveDevice(ctx, installationId);
    const batches: PushedChanges = {
      transactions: changes.transactions ?? [],
      financialAccounts: changes.financialAccounts ?? [],
      categories: changes.categories ?? [],
      events: changes.events ?? [],
    };
    const total = syncedTables.reduce((sum, table) => sum + batches[table].length, 0);

    if (total > maximumChangesPerPush) {
      throw new ConvexError(`A push carries at most ${maximumChangesPerPush} changes.`);
    }

    for (const table of syncedTables) {
      for (const change of batches[table]) {
        const problem = changeProblem(table, change);

        if (problem !== null) {
          throw new ConvexError(problem);
        }
      }
    }

    const owner = await findOwner(ctx, ownerId);

    if (isDeletionRequested(owner)) {
      throw new ConvexError('This account is being deleted.');
    }

    const now = Date.now();
    const cost = total + 1;
    const allowance = refilledAllowance(
      owner === null
        ? { available: pushAllowancePolicy.capacity, updatedAt: now }
        : { available: owner.pushAllowance, updatedAt: owner.pushAllowanceAt },
      pushAllowancePolicy,
      now,
    );

    if (allowance < cost) {
      throw new ConvexError('Too many changes at once. Try again in a few minutes.');
    }

    const sequenceBefore = owner?.sequence ?? 0;
    let sequence = sequenceBefore;

    for (const table of syncedTables) {
      if (table === 'transactions') {
        await assertOwnedAccounts(ctx, ownerId, batches.transactions);
      }

      sequence = await storeChanges(ctx, table, ownerId, batches[table], sequence, now);
    }

    await saveOwner(
      ctx,
      ownerId,
      owner,
      { sequence, pushAllowance: allowance - cost, pushAllowanceAt: now },
      now,
    );

    if (isLastSeenStale(device, now)) {
      await ctx.db.patch(device._id, { lastSeenAt: now });
    }

    return { sequenceBefore, sequence };
  },
});

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
      await ctx.scheduler.runAfter(0, internal.sync.purgeExpiredTombstones, {});
    }
  },
});
