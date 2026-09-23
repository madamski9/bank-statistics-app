import type { Auth } from 'convex/server';
import { ConvexError } from 'convex/values';

export async function requireOwnerId(auth: Auth): Promise<string> {
  const identity = await auth.getUserIdentity();

  if (identity === null) {
    throw new ConvexError('Sign in to synchronize transactions.');
  }

  return identity.subject;
}
