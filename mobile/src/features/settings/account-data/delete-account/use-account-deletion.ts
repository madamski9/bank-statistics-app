import { api } from '@bankstats/convex/convex/_generated/api';
import { isIdentityCheckRequired } from '@bankstats/convex/convex/owner';
import { useAuth } from '@clerk/expo';
import { useAction, useMutation } from 'convex/react';
import { ConvexError } from 'convex/values';
import { useCallback, useState } from 'react';

export type DeletionStep = 'explain' | 'verify' | 'deleting' | 'failed';

const maximumDeletionRounds = 200;

interface DeletionProgress {
  isComplete: boolean;
}

function isStaleVerification(error: unknown): boolean {
  return error instanceof ConvexError && isIdentityCheckRequired(error.data);
}

export function useAccountDeletion() {
  const startDeletion = useAction(api.account.startDeletion);
  const deleteData = useMutation(api.account.deleteData);
  const { getToken } = useAuth();
  const [step, setStep] = useState<DeletionStep>('explain');

  const runDeletion = useCallback(
    async (begin: () => Promise<DeletionProgress>) => {
      setStep('deleting');

      try {
        let progress = await begin();

        for (let round = 1; !progress.isComplete && round < maximumDeletionRounds; round += 1) {
          progress = await deleteData({});
        }

        if (!progress.isComplete) {
          setStep('failed');
        }
      } catch (error) {
        setStep(isStaleVerification(error) ? 'verify' : 'failed');
      }
    },
    [deleteData],
  );

  const deleteAfterVerification = useCallback(() => {
    void runDeletion(async () => {
      const sessionToken = await getToken({ skipCache: true });

      if (sessionToken === null) {
        throw new Error('The session token is unavailable.');
      }

      return startDeletion({ sessionToken });
    });
  }, [getToken, runDeletion, startDeletion]);

  const retryDeletion = useCallback(() => {
    void runDeletion(() => deleteData({}));
  }, [deleteData, runDeletion]);

  return {
    step,
    requestVerification: () => setStep('verify'),
    deleteAfterVerification,
    retryDeletion,
  };
}
