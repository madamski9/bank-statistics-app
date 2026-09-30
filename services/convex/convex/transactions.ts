import { ConvexError, v, type Infer } from 'convex/values';

import { mutation, query, type QueryCtx } from './_generated/server';
import { transactionFields } from './schema';
import {
  assertBoundedText,
  assertPushSize,
  assertValidRevision,
  isIsoTimestamp,
  requireDevice,
  storeChanges,
  withoutServerFields,
} from './syncedRows';

const transactionChange = v.object({
  ...transactionFields,
  revision: v.number(),
  deleted: v.boolean(),
});

type TransactionChange = Infer<typeof transactionChange>;

const currencyPattern = /^[A-Z]{3}$/;
const decimalRatePattern = /^\d{1,6}(?:\.\d{1,8})?$/;
const calendarDatePattern = /^\d{4}-\d{2}-\d{2}$/;

const captureBanks = new Set(['millennium', 'pko']);

function assertValidChange(change: TransactionChange) {
  if (change.origin === 'capture' && !captureBanks.has(change.bank)) {
    throw new ConvexError('Only enabled banks can synchronize captured transactions.');
  }

  if (change.origin === 'manual' && (change.accountId === undefined || change.accountId.trim() === '')) {
    throw new ConvexError('A manual transaction belongs to a Financial Account.');
  }

  if (!Number.isSafeInteger(change.amountMinor) || change.amountMinor <= 0) {
    throw new ConvexError('An amount is a positive whole number of minor units.');
  }

  if (!currencyPattern.test(change.currency)) {
    throw new ConvexError('A currency is a three-letter ISO code.');
  }

  if (!isIsoTimestamp(change.occurredAt) || !isIsoTimestamp(change.capturedAt)) {
    throw new ConvexError('Occurrence and capture times are ISO 8601 timestamps.');
  }

  if (
    change.reportingAmountMinor !== undefined &&
    (!Number.isSafeInteger(change.reportingAmountMinor) || change.reportingAmountMinor <= 0)
  ) {
    throw new ConvexError('A reporting amount is a positive whole number of minor units.');
  }

  if (change.exchangeRate !== undefined && !decimalRatePattern.test(change.exchangeRate)) {
    throw new ConvexError('An exchange rate is a decimal number.');
  }

  if (change.exchangeRateDate !== undefined && !calendarDatePattern.test(change.exchangeRateDate)) {
    throw new ConvexError('An exchange rate date is a calendar date.');
  }

  [
    change.bank,
    change.merchant,
    change.category,
    change.sourceApp,
    change.accountId,
    change.accountName,
    change.eventId,
    change.exchangeRateTable,
  ].forEach(assertBoundedText);
  assertValidRevision(change);
}

const generalAccountIds = new Set(['general-manual', 'general-millennium', 'general-pko']);

async function assertOwnedAccount(ctx: QueryCtx, ownerId: string, change: TransactionChange) {
  const accountId = change.accountId;

  if (change.deleted || accountId === undefined || generalAccountIds.has(accountId)) {
    return;
  }

  const account = await ctx.db
    .query('financialAccounts')
    .withIndex('by_owner_client', (index) => index.eq('ownerId', ownerId).eq('clientId', accountId))
    .unique();

  if (account === null || account.deleted) {
    throw new ConvexError('A transaction belongs to one of your Financial Accounts.');
  }
}

export const push = mutation({
  args: { installationId: v.string(), changes: v.array(transactionChange) },
  handler: async (ctx, { installationId, changes }) => {
    const owner = await requireDevice(ctx, installationId);
    assertPushSize(changes);
    changes.forEach(assertValidChange);
    await Promise.all(
      changes.map((change) => assertOwnedAccount(ctx, owner.ownerId, change)),
    );
    await storeChanges(ctx, 'transactions', owner, changes);
  },
});

export const list = query({
  args: { installationId: v.string() },
  handler: async (ctx, { installationId }) => {
    const { ownerId } = await requireDevice(ctx, installationId);
    const rows = await ctx.db
      .query('transactions')
      .withIndex('by_owner', (index) => index.eq('ownerId', ownerId))
      .collect();

    return rows.map(withoutServerFields);
  },
});
