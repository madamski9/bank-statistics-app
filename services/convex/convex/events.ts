import { ConvexError, v, type Infer } from 'convex/values';

import { mutation, query } from './_generated/server';
import { eventFields } from './schema';
import {
  assertBoundedText,
  assertPushSize,
  assertValidRevision,
  isIsoTimestamp,
  requireDevice,
  storeChanges,
  withoutServerFields,
} from './syncedRows';

const eventChange = v.object({
  ...eventFields,
  revision: v.number(),
  deleted: v.boolean(),
});

type EventChange = Infer<typeof eventChange>;

const maximumEventNameLength = 60;

function assertValidChange(change: EventChange) {
  const name = change.name.trim();

  if (name === '' || name.length > maximumEventNameLength) {
    throw new ConvexError(`An event name has between 1 and ${maximumEventNameLength} characters.`);
  }

  if (!isIsoTimestamp(change.startedAt) || (change.endedAt !== undefined && !isIsoTimestamp(change.endedAt))) {
    throw new ConvexError('An event starts and ends at ISO 8601 timestamps.');
  }

  if (change.endedAt !== undefined && Date.parse(change.endedAt) < Date.parse(change.startedAt)) {
    throw new ConvexError('An event cannot end before it starts.');
  }

  assertBoundedText(change.clientId);
  assertValidRevision(change);
}

export const push = mutation({
  args: { installationId: v.string(), changes: v.array(eventChange) },
  handler: async (ctx, { installationId, changes }) => {
    const owner = await requireDevice(ctx, installationId);
    assertPushSize(changes);
    changes.forEach(assertValidChange);
    await storeChanges(ctx, 'events', owner, changes);
  },
});

export const list = query({
  args: { installationId: v.string() },
  handler: async (ctx, { installationId }) => {
    const { ownerId } = await requireDevice(ctx, installationId);
    const rows = await ctx.db
      .query('events')
      .withIndex('by_owner', (index) => index.eq('ownerId', ownerId))
      .collect();

    return rows.map(withoutServerFields);
  },
});
