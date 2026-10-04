import { ConvexError, v, type Infer } from 'convex/values';

import { mutation, query } from './_generated/server';
import { categoryChangeProblem, maximumCategoryNameLength } from './changeRules';
import { categoryFields } from './schema';
import {
  assertPushSize,
  requireDevice,
  storeChanges,
  withoutServerFields,
} from './syncedRows';

const categoryChange = v.object({
  ...categoryFields,
  revision: v.number(),
  deleted: v.boolean(),
});

type CategoryChange = Infer<typeof categoryChange>;

export { maximumCategoryNameLength };

function assertValidChange(change: CategoryChange) {
  const problem = categoryChangeProblem(change);

  if (problem !== null) {
    throw new ConvexError(problem);
  }
}

export const push = mutation({
  args: { installationId: v.string(), changes: v.array(categoryChange) },
  handler: async (ctx, { installationId, changes }) => {
    const owner = await requireDevice(ctx, installationId);
    assertPushSize(changes);
    changes.forEach(assertValidChange);
    await storeChanges(ctx, 'categories', owner, changes);
  },
});

export const list = query({
  args: { installationId: v.string() },
  handler: async (ctx, { installationId }) => {
    const { ownerId } = await requireDevice(ctx, installationId);
    const rows = await ctx.db
      .query('categories')
      .withIndex('by_owner', (index) => index.eq('ownerId', ownerId))
      .collect();

    return rows.map(withoutServerFields);
  },
});
