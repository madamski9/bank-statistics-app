import type { Auth } from 'convex/server';
import { ConvexError } from 'convex/values';

export interface SignedInOwner {
  ownerId: string;
  sessionId: string;
}

export async function requireSignedIn(auth: Auth): Promise<SignedInOwner> {
  const identity = await auth.getUserIdentity();

  if (identity === null) {
    throw new ConvexError('Sign in to synchronize transactions.');
  }

  if (typeof identity.sid !== 'string' || identity.sid === '') {
    throw new ConvexError('Sign in again to continue.');
  }

  return { ownerId: identity.subject, sessionId: identity.sid };
}

export async function requireOwnerId(auth: Auth): Promise<string> {
  return (await requireSignedIn(auth)).ownerId;
}
