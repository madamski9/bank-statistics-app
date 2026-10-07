import type { Auth } from 'convex/server';
import { ConvexError } from 'convex/values';

export interface SignedInOwner {
  ownerId: string;
  sessionId: string;
}

const identityCheckRequired = 'identityCheckRequired';

export function isIdentityCheckRequired(data: unknown): boolean {
  return typeof data === 'object' && data !== null && 'code' in data && data.code === identityCheckRequired;
}

export function identityCheckRequiredError(): ConvexError<{ code: string; message: string }> {
  return new ConvexError({ code: identityCheckRequired, message: 'Confirm your identity again to continue.' });
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
