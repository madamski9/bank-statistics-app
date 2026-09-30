import { ConvexError, v, type Infer } from 'convex/values';

import { mutation, query } from './_generated/server';
import { categoryFields } from './schema';
import {
  assertPushSize,
  assertValidRevision,
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

export const maximumCategoryNameLength = 40;
const customCategoryIdPattern = /^category-[a-z0-9-]{1,60}$/;

function assertValidChange(change: CategoryChange) {
  const name = change.name.trim();

  if (name === '' || name.length > maximumCategoryNameLength) {
    throw new ConvexError(`A category name has between 1 and ${maximumCategoryNameLength} characters.`);
  }

  if (!customCategoryIdPattern.test(change.clientId)) {
    throw new ConvexError('A custom category has a category- identifier.');
  }

  assertValidRevision(change);
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
