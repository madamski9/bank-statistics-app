import { api } from '@bankstats/convex/convex/_generated/api';
import type { ConvexReactClient } from 'convex/react';

import { setCloudSyncEnabled } from './cloud-sync-preference';
import { encryptedLedgerStorage } from './encrypted-ledger-storage';
import { forgetSyncedState } from './sync-runner';

const maximumRounds = 50;

export async function keepDataOnThisDeviceOnly(
  convex: ConvexReactClient,
  ownerId: string,
): Promise<void> {
  await setCloudSyncEnabled(false);

  for (let round = 0; round < maximumRounds; round += 1) {
    const { isComplete } = await convex.mutation(api.account.deleteCloudCopy, {});

    if (round === 0) {
      await forgetSyncedState(encryptedLedgerStorage, ownerId);
    }

    if (isComplete) {
      return;
    }
  }

  throw new Error('The cloud copy is still being removed.');
}
