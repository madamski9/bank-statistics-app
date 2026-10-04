import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { requestAlertPermission } from '@/features/alerts/expo-alert-notifier';

import {
  readMonthlySummaryReminder,
  writeMonthlySummaryReminder,
} from './monthly-summary-preference';
import {
  cancelMonthlySummaryReminder,
  scheduleMonthlySummaryReminder,
} from './monthly-summary-reminder';

export interface MonthlySummaryReminder {
  isEnabled: boolean;
  isDenied: boolean;
  setEnabled: (isEnabled: boolean) => Promise<void>;
  confirmPermission: () => Promise<void>;
}

type PermissionState = 'granted' | 'undetermined' | 'denied';

async function notificationPermission(): Promise<PermissionState> {
  const current = await Notifications.getPermissionsAsync();

  if (current.granted || current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return 'granted';
  }

  return current.canAskAgain ? 'undetermined' : 'denied';
}

export function useMonthlySummaryReminder(isPremium: boolean | undefined): MonthlySummaryReminder {
  const [isStored, setIsStored] = useState(true);
  const [permission, setPermission] = useState<PermissionState>('undetermined');
  const [isDenied, setIsDenied] = useState(false);

  useEffect(() => {
    if (isPremium === undefined) {
      return;
    }

    let isActive = true;

    const reschedule = () => {
      void Promise.all([readMonthlySummaryReminder(), notificationPermission()]).then(([stored, state]) => {
        if (!isActive) {
          return;
        }

        setIsStored(stored);
        setPermission(state);

        if (stored && isPremium && state === 'granted') {
          void scheduleMonthlySummaryReminder().catch(() => undefined);
        } else if (stored && !isPremium) {
          void cancelMonthlySummaryReminder().catch(() => undefined);
        }
      });
    };

    reschedule();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        reschedule();
      }
    });

    return () => {
      isActive = false;
      subscription.remove();
    };
  }, [isPremium]);

  const setEnabled = useCallback(async (next: boolean) => {
    if (isPremium !== true) {
      return;
    }

    if (next) {
      const isGranted = await requestAlertPermission();
      setIsDenied(!isGranted);
      setPermission(isGranted ? 'granted' : 'denied');

      if (!isGranted) {
        return;
      }

      await scheduleMonthlySummaryReminder();
    } else {
      await cancelMonthlySummaryReminder();
    }

    await writeMonthlySummaryReminder(next);
    setIsStored(next);
  }, [isPremium]);

  const confirmPermission = useCallback(async () => {
    if (isPremium !== true || !isStored || permission !== 'undetermined') {
      return;
    }

    const isGranted = await requestAlertPermission();
    setPermission(isGranted ? 'granted' : 'denied');

    if (isGranted) {
      await scheduleMonthlySummaryReminder().catch(() => undefined);
    }
  }, [isPremium, isStored, permission]);

  return {
    isEnabled: isStored && permission !== 'denied',
    isDenied,
    setEnabled,
    confirmPermission,
  };
}
