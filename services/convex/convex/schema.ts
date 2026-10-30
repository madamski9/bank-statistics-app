import { defineSchema, defineTable } from 'convex/server';
import { v, type PropertyValidators } from 'convex/values';

import { storeSubscriptionFields } from './revenueCat';

export const devicePlatform = v.union(v.literal('ios'), v.literal('android'), v.literal('web'));

export const transactionFields = {
  clientId: v.string(),
  bank: v.string(),
  bankName: v.optional(v.string()),
  origin: v.union(v.literal('capture'), v.literal('manual')),
  direction: v.union(v.literal('expense'), v.literal('income')),
  transactionType: v.optional(
    v.union(
      v.literal('cardPayment'),
      v.literal('blikPayment'),
      v.literal('outgoingTransfer'),
      v.literal('incomingTransfer'),
      v.literal('atmWithdrawal'),
      v.literal('refund'),
      v.literal('fee'),
      v.literal('interest'),
    ),
  ),
  amountMinor: v.number(),
  currency: v.string(),
  merchant: v.optional(v.string()),
  category: v.optional(v.string()),
  sourceApp: v.optional(v.string()),
  review: v.optional(
    v.union(
      v.literal('amount'),
      v.literal('currency'),
      v.literal('direction'),
      v.literal('merchant'),
    ),
  ),
  accountId: v.optional(v.string()),
  accountName: v.optional(v.string()),
  occurredAt: v.string(),
  capturedAt: v.string(),
  status: v.union(v.literal('pending'), v.literal('posted'), v.literal('reversed')),
  eventId: v.optional(v.string()),
  reportingAmountMinor: v.optional(v.number()),
  exchangeRate: v.optional(v.string()),
  exchangeRateDate: v.optional(v.string()),
  exchangeRateTable: v.optional(v.string()),
};

export const financialAccountFields = {
  clientId: v.string(),
  bank: v.string(),
  name: v.string(),
  isGeneral: v.boolean(),
};

export const categoryFields = {
  clientId: v.string(),
  name: v.string(),
};

export const eventFields = {
  clientId: v.string(),
  name: v.string(),
  startedAt: v.string(),
  endedAt: v.optional(v.string()),
  color: v.optional(v.string()),
};

const syncedRowFields = {
  ownerId: v.string(),
  clientId: v.string(),
  revision: v.number(),
  sequence: v.number(),
};

function syncedTable<Fields extends PropertyValidators>(fields: Fields) {
  return defineTable(
    v.union(
      v.object({ ...fields, ...syncedRowFields, deleted: v.literal(false) }),
      v.object({ ...syncedRowFields, deleted: v.literal(true), deletedAt: v.number() }),
    ),
  )
    .index('by_owner_client', ['ownerId', 'clientId'])
    .index('by_owner_sequence', ['ownerId', 'sequence'])
    .index('by_deleted_at', ['deletedAt']);
}

export default defineSchema({
  owners: defineTable({
    ownerId: v.string(),
    sequence: v.number(),
    pushAllowance: v.number(),
    pushAllowanceAt: v.number(),
    rateLookupAllowance: v.number(),
    rateLookupAllowanceAt: v.number(),
    deletionRequestedAt: v.optional(v.number()),
    dataPurgedAt: v.optional(v.number()),
    legacyOwnerId: v.optional(v.string()),
  }).index('by_owner', ['ownerId']),
  devices: defineTable({
    ownerId: v.string(),
    installationId: v.string(),
    sessionId: v.string(),
    platform: devicePlatform,
    registeredAt: v.number(),
    lastSeenAt: v.number(),
    revokedAt: v.optional(v.number()),
  })
    .index('by_owner_revoked', ['ownerId', 'revokedAt'])
    .index('by_owner_installation', ['ownerId', 'installationId'])
    .index('by_session_revoked', ['sessionId', 'revokedAt']),
  profiles: defineTable({
    ownerId: v.string(),
    isPremium: v.boolean(),
    premiumSince: v.optional(v.number()),
    premiumUntil: v.optional(v.number()),
    storeSubscription: v.optional(storeSubscriptionFields),
    storeSubscriptionRecheck: v.optional(v.id('_scheduled_functions')),
  }).index('by_owner', ['ownerId']),
  premiumCodes: defineTable({
    code: v.string(),
    months: v.optional(v.number()),
    createdAt: v.number(),
    redeemedAt: v.optional(v.number()),
  }).index('by_code', ['code']),
  transactions: syncedTable(transactionFields),
  financialAccounts: syncedTable(financialAccountFields),
  categories: syncedTable(categoryFields),
  events: syncedTable(eventFields),
  diagnosticSamples: defineTable({
    ownerId: v.string(),
    clientId: v.string(),
    notification: v.object({ title: v.string(), subtitle: v.string(), body: v.string(), sourceApp: v.string() }),
    clientParserVersion: v.number(),
    parserVersion: v.number(),
    reasonCode: v.string(),
    resultJson: v.string(),
    submittedAt: v.number(),
    expiresAt: v.number(),
  })
    .index('by_owner_client', ['ownerId', 'clientId'])
    .index('by_owner_submitted', ['ownerId', 'submittedAt'])
    .index('by_expiry', ['expiresAt']),
  exchangeRates: defineTable({
    currency: v.string(),
    requestedDate: v.string(),
    effectiveDate: v.string(),
    mid: v.string(),
    table: v.string(),
    fetchedAt: v.number(),
  }).index('by_currency_date', ['currency', 'requestedDate']),
});
