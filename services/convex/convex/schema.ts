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
      v.literal('outgoingTransfer'),
      v.literal('incomingTransfer'),
    ),
  ),
  amountMinor: v.number(),
  currency: v.string(),
  merchant: v.optional(v.string()),
  category: v.optional(v.string()),
  accountName: v.optional(v.string()),
  occurredAt: v.string(),
  capturedAt: v.string(),
  status: v.union(v.literal('pending'), v.literal('posted'), v.literal('reversed')),
};

export default defineSchema({
  devices: defineTable({
    ownerId: v.string(),
    installationId: v.string(),
    platform: devicePlatform,
    registeredAt: v.number(),
    lastSeenAt: v.number(),
  }).index('by_owner_installation', ['ownerId', 'installationId']),
  transactions: defineTable({
    ownerId: v.string(),
    ...transactionFields,
    revision: v.number(),
    deleted: v.boolean(),
    lastDeviceId: v.id('devices'),
  })
    .index('by_owner', ['ownerId'])
    .index('by_owner_client', ['ownerId', 'clientId']),
});
