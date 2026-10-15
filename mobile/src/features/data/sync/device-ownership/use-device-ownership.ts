import { useAuth } from '@clerk/expo';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { clearLocalData } from '../cloud-sync/clear-local-data';
import { encryptedLedgerStorage } from '../codecs/encrypted-ledger-storage';
import { claimDevice } from '../engine/sync-runner';

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
  const [check, setCheck] = useState<OwnershipCheck | null>(null);
  const isSupported = Platform.OS === 'ios';

  useEffect(() => {
    if (!isSupported || userId == null) {
      return;
    }

    let isActive = true;

    claimDevice(encryptedLedgerStorage, userId)
      .then((isOwnDevice) => {
        if (isActive) {
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
  }, [isSupported, userId]);

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
