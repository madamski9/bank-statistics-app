import { ConvexError, v, type Infer } from 'convex/values';

import { mutation, query } from './_generated/server';
import { eventChangeProblem } from './changeRules';
import { eventFields } from './schema';
import {
  assertPushSize,
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

function assertValidChange(change: EventChange) {
  const problem = eventChangeProblem(change);

  if (problem !== null) {
    throw new ConvexError(problem);
  }
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
