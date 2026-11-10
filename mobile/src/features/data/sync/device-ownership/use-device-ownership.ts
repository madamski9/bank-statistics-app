import { api } from '@bankstats/convex/convex/_generated/api';
import { useAuth } from '@clerk/expo';
import { useConvex, useConvexAuth } from 'convex/react';
import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { readableWhileLocked } from '@/features/onboarding/onboarding-keychain';
import { transferOnboardingState } from '@/features/onboarding/onboarding-transfer';

import { clearLocalData } from '../cloud-sync/clear-local-data';
import { encryptedLedgerStorage } from '../codecs/encrypted-ledger-storage';
import { claimDevice, transferDevice } from '../engine/sync-runner';
import { isOwnedAfterHandover, type AccountHandover } from './account-handover';

export type DeviceOwnership = 'checking' | 'own' | 'foreign';

interface OwnershipCheck {
  userId: string;
  ownership: DeviceOwnership;
}

export interface DeviceOwnershipState {
  ownership: DeviceOwnership;
  takeOver: () => Promise<void>;
}

export function useDeviceOwnership(): DeviceOwnershipState {
  const { userId } = useAuth();
  const convex = useConvex();
  const { isAuthenticated } = useConvexAuth();
  const [check, setCheck] = useState<OwnershipCheck | null>(null);
  const isSupported = Platform.OS === 'ios' || Platform.OS === 'android';

  useEffect(() => {
    if (!isSupported || userId == null) {
      return;
    }

    let isActive = true;
    const handover: AccountHandover = {
      claim: (owner) => claimDevice(encryptedLedgerStorage, owner),
      previousOwnerOf: () => convex.query(api.owners.legacyOwnerId, {}),
      transferOnboarding: (previousUserId, owner) =>
        transferOnboardingState(SecureStore, readableWhileLocked, previousUserId, owner),
      transferDevice: (previousUserId, owner) => transferDevice(encryptedLedgerStorage, previousUserId, owner),
    };

    const ownership = isAuthenticated
      ? isOwnedAfterHandover(handover, userId)
      : claimDevice(encryptedLedgerStorage, userId).then((isOwnDevice) => (isOwnDevice ? true : null));

    ownership
      .then((isOwnDevice) => {
        if (isActive && isOwnDevice !== null) {
          setCheck({ userId, ownership: isOwnDevice ? 'own' : 'foreign' });
        }
      })
      .catch(() => {
        if (isActive) {
          setCheck({ userId, ownership: 'foreign' });
        }
      });

    return () => {
      isActive = false;
    };
  }, [convex, isAuthenticated, isSupported, userId]);

  const takeOver = useCallback(async () => {
    if (userId == null) {
      return;
    }

    await clearLocalData();
    await claimDevice(encryptedLedgerStorage, userId);
    setCheck({ userId, ownership: 'own' });
  }, [userId]);

  if (!isSupported) {
    return { ownership: 'own', takeOver };
  }

  const ownership = check !== null && check.userId === userId ? check.ownership : 'checking';

  return { ownership, takeOver };
}
