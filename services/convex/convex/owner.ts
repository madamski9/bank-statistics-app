import type { Auth } from 'convex/server';
import { ConvexError } from 'convex/values';

export interface SignedInOwner {
  ownerId: string;
  sessionId: string;
  firstFactorAgeMinutes: number | null;
}

export const reverificationWindowMinutes = 10;

function firstFactorAge(claim: unknown): number | null {
  if (!Array.isArray(claim) || typeof claim[0] !== 'number' || claim[0] < 0) {
    return null;
  }

  return claim[0];
}

export function assertRecentlyVerified(owner: SignedInOwner) {
  if (owner.firstFactorAgeMinutes === null || owner.firstFactorAgeMinutes > reverificationWindowMinutes) {
    throw new ConvexError('Confirm your identity again to continue.');
  }
}

export async function requireSignedIn(auth: Auth): Promise<SignedInOwner> {
  const identity = await auth.getUserIdentity();

  if (identity === null) {
    throw new ConvexError('Sign in to synchronize transactions.');
  }

  if (typeof identity.sid !== 'string' || identity.sid === '') {
    throw new ConvexError('Sign in again to continue.');
  }

  return {
    ownerId: identity.subject,
    sessionId: identity.sid,
    firstFactorAgeMinutes: firstFactorAge(identity.fva),
  };
}

export async function requireOwnerId(auth: Auth): Promise<string> {
  return (await requireSignedIn(auth)).ownerId;
}
