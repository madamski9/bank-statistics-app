import type { Auth } from 'convex/server';
import { ConvexError } from 'convex/values';

import type { Doc } from './_generated/dataModel';
import type { QueryCtx } from './_generated/server';

export async function requireOwnerId(auth: Auth): Promise<string> {
  const identity = await auth.getUserIdentity();

  if (identity === null) {
    throw new ConvexError('Sign in to synchronize transactions.');
  }

  return identity.subject;
}

export async function findDevice(
  ctx: QueryCtx,
  ownerId: string,
  installationId: string,
): Promise<Doc<'devices'> | null> {
  return ctx.db
    .query('devices')
    .withIndex('by_owner_installation', (index) =>
      index.eq('ownerId', ownerId).eq('installationId', installationId),
    )
    .unique();
}
