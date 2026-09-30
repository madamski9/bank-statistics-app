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
}

export function useMonthlySummaryReminder(): MonthlySummaryReminder {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isDenied, setIsDenied] = useState(false);

  useEffect(() => {
    let isActive = true;

    const reschedule = () => {
      void readMonthlySummaryReminder().then((stored) => {
        if (!isActive) {
          return;
        }

        setIsEnabled(stored);

        if (stored) {
          void scheduleMonthlySummaryReminder(new Date()).catch(() => undefined);
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
  }, []);

  const setEnabled = useCallback(async (next: boolean) => {
    if (next) {
      const isGranted = await requestAlertPermission();
      setIsDenied(!isGranted);

      if (!isGranted) {
        return;
      }

      await scheduleMonthlySummaryReminder(new Date());
    } else {
      await cancelMonthlySummaryReminder();
    }

    await writeMonthlySummaryReminder(next);
    setIsEnabled(next);
  }, []);

  return { isEnabled, isDenied, setEnabled };
}
