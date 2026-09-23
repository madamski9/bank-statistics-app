import { clearIngestionRecords } from '@bankstats/ingestion-native';
import { useAuth } from '@clerk/expo';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { clearAlertStorage } from '@/features/alerts/secure-alert-storage';
import { clearCategorizationRules } from '@/features/classification/use-categorization-rules';
import { clearAccountStorage } from '@/features/financial-accounts/file-account-storage';

import { clearLedger, fileLedgerStorage } from './file-ledger-storage';
import { claimDevice } from './sync-runner';

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

    claimDevice(fileLedgerStorage, userId)
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

    await clearIngestionRecords();
    await Promise.all([clearAlertStorage(), clearCategorizationRules()]);
    clearAccountStorage();
    clearLedger();
    await claimDevice(fileLedgerStorage, userId);
    setCheck({ userId, ownership: 'own' });
  }, [userId]);

  if (!isSupported) {
    return { ownership: 'own', takeOver };
  }

  const ownership = check !== null && check.userId === userId ? check.ownership : 'checking';

  return { ownership, takeOver };
}
