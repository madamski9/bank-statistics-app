import { useSSO } from '@clerk/expo';
import { useCallback, useState } from 'react';

import { useCopy } from '@/features/app-shell/localization/language';

import { authCopy } from '../auth-copy';

export type SocialStrategy = 'oauth_google' | 'oauth_apple';

export function useSocialSignIn() {
  const copy = useCopy(authCopy);
  const { startSSOFlow } = useSSO();
  const [activeStrategy, setActiveStrategy] = useState<SocialStrategy | null>(null);
  const [error, setError] = useState<string | null>(null);

  const signInWith = useCallback(
    async (strategy: SocialStrategy) => {
      setError(null);
      setActiveStrategy(strategy);

      try {
        const { createdSessionId, setActive, signUp } = await startSSOFlow({ strategy });

        if (createdSessionId && setActive) {
          await setActive({ session: createdSessionId });
          return;
        }

        if (signUp?.status === 'missing_requirements') {
          setError(copy.socialIncomplete);
        }
      } catch {
        setError(copy.socialFailed);
      } finally {
        setActiveStrategy(null);
      }
    },
    [copy, startSSOFlow],
  );

  return { activeStrategy, error, signInWith };
}
