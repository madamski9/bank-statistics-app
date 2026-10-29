import { diagnosticSamplePreview, diagnosticSampleProblem } from '@bankstats/parser-rules';
import { ConvexError, v } from 'convex/values';

import { internal } from './_generated/api';
import { internalMutation, mutation } from './_generated/server';
import { requireTrustedSession } from './devices';
import { findOwner, isDeletionRequested } from './owners';

export const diagnosticRetentionMs = 90 * 24 * 60 * 60 * 1000;
const dayMs = 24 * 60 * 60 * 1000;
const maximumDailySamples = 10;
const deletionBatchSize = 100;

export const submit = mutation({
  args: {
    clientId: v.string(),
    notification: v.object({
      title: v.string(),
      subtitle: v.string(),
      body: v.string(),
      sourceApp: v.string(),
    }),
    clientParserVersion: v.number(),
    reasonCode: v.string(),
    reviewed: v.literal(true),
  },
  handler: async (ctx, { clientId, notification, clientParserVersion, reasonCode }) => {
    const { ownerId } = await requireTrustedSession(ctx);
    if (isDeletionRequested(await findOwner(ctx, ownerId))) {
      throw new ConvexError('This account is being deleted.');
    }
    if (!/^[a-zA-Z0-9-]{1,100}$/.test(clientId) || !/^[a-zA-Z0-9_.-]{1,80}$/.test(reasonCode)) {
      throw new ConvexError('Invalid diagnostic metadata.');
    }
    if (!Number.isSafeInteger(clientParserVersion) || clientParserVersion < 0) {
      throw new ConvexError('Invalid parser version.');
    }
    const problem = diagnosticSampleProblem(notification);
    if (problem !== null) {
      throw new ConvexError(`Diagnostic sample: ${problem}.`);
    }
    const existing = await ctx.db
      .query('diagnosticSamples')
      .withIndex('by_owner_client', (index) =>
        index.eq('ownerId', ownerId).eq('clientId', clientId),
      )
      .unique();
    if (existing !== null) {
      return existing._id;
    }
    const now = Date.now();
    const recent = await ctx.db
      .query('diagnosticSamples')
      .withIndex('by_owner_submitted', (index) =>
        index.eq('ownerId', ownerId).gt('submittedAt', now - dayMs),
      )
      .take(maximumDailySamples);
    if (recent.length >= maximumDailySamples) {
      throw new ConvexError({
        code: 'diagnosticDailyLimit',
        message: 'Try submitting another diagnostic sample tomorrow.',
      });
    }
    const preview = diagnosticSamplePreview(notification);
    return ctx.db.insert('diagnosticSamples', {
      ownerId,
      clientId,
      notification,
      clientParserVersion,
      reasonCode,
      parserVersion: preview.parserVersion,
      resultJson: JSON.stringify(preview.result),
      submittedAt: now,
      expiresAt: now + diagnosticRetentionMs,
    });
  },
});

export const purgeExpired = internalMutation({
  args: {},
  handler: async (ctx) => {
    const expired = await ctx.db
      .query('diagnosticSamples')
      .withIndex('by_expiry', (index) => index.lte('expiresAt', Date.now()))
      .take(deletionBatchSize);
    await Promise.all(expired.map((sample) => ctx.db.delete(sample._id)));
    if (expired.length === deletionBatchSize) {
      await ctx.scheduler.runAfter(0, internal.diagnosticSamples.purgeExpired, {});
    }
  },
});
