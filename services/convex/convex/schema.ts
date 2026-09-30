import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export const devicePlatform = v.union(v.literal('ios'), v.literal('android'), v.literal('web'));

export const transactionFields = {
  clientId: v.string(),
  bank: v.string(),
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
};

export const syncedRowFields = {
  ownerId: v.string(),
  revision: v.number(),
  deleted: v.boolean(),
  deletedAt: v.optional(v.number()),
  lastDeviceId: v.id('devices'),
};

export default defineSchema({
  devices: defineTable({
    ownerId: v.string(),
    installationId: v.string(),
    platform: devicePlatform,
    registeredAt: v.number(),
    lastSeenAt: v.number(),
    revokedAt: v.optional(v.number()),
  })
    .index('by_owner', ['ownerId'])
    .index('by_owner_installation', ['ownerId', 'installationId']),
  profiles: defineTable({
    ownerId: v.string(),
    isPremium: v.boolean(),
    premiumSince: v.optional(v.number()),
  }).index('by_owner', ['ownerId']),
  accountDeletions: defineTable({
    ownerId: v.string(),
    requestedAt: v.number(),
  }).index('by_owner', ['ownerId']),
  transactions: defineTable({ ...transactionFields, ...syncedRowFields })
    .index('by_owner', ['ownerId'])
    .index('by_owner_client', ['ownerId', 'clientId'])
    .index('by_deleted_at', ['deletedAt']),
  financialAccounts: defineTable({ ...financialAccountFields, ...syncedRowFields })
    .index('by_owner', ['ownerId'])
    .index('by_owner_client', ['ownerId', 'clientId'])
    .index('by_deleted_at', ['deletedAt']),
  categories: defineTable({ ...categoryFields, ...syncedRowFields })
    .index('by_owner', ['ownerId'])
    .index('by_owner_client', ['ownerId', 'clientId'])
    .index('by_deleted_at', ['deletedAt']),
  events: defineTable({ ...eventFields, ...syncedRowFields })
    .index('by_owner', ['ownerId'])
    .index('by_owner_client', ['ownerId', 'clientId'])
    .index('by_deleted_at', ['deletedAt']),
  exchangeRates: defineTable({
    currency: v.string(),
    requestedDate: v.string(),
    effectiveDate: v.string(),
    mid: v.string(),
    table: v.string(),
    fetchedAt: v.number(),
  }).index('by_currency_date', ['currency', 'requestedDate']),
});
