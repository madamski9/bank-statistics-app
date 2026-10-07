import { useAuth, useClerk } from '@clerk/expo';
import { useCallback, useMemo, useSyncExternalStore } from 'react';

interface TokenRequest {
  forceRefreshToken: boolean;
}

let identityGeneration = 0;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

function currentIdentityGeneration(): number {
  return identityGeneration;
}

export function refreshConvexIdentity(): void {
  identityGeneration += 1;
  listeners.forEach((listener) => listener());
}

export function useConvexAuthFromClerk() {
  const { isLoaded, isSignedIn, sessionId, sessionClaims } = useAuth();
  const clerk = useClerk();
  const generation = useSyncExternalStore(subscribe, currentIdentityGeneration);
  const audience = sessionClaims?.aud;

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: TokenRequest): Promise<string | null> => {
      const skipCache = forceRefreshToken || generation > 0;

      try {
        const session = clerk.session;

        if (session == null || session.id !== sessionId) {
          return null;
        }

        return audience === 'convex'
          ? await session.getToken({ skipCache })
          : await session.getToken({ template: 'convex', skipCache });
      } catch {
        return null;
      }
    },
    [audience, clerk, generation, sessionId],
  );

  return useMemo(
    () => ({
      isLoading: !isLoaded,
      isAuthenticated: isSignedIn ?? false,
      fetchAccessToken,
    }),
    [fetchAccessToken, isLoaded, isSignedIn],
  );
}
