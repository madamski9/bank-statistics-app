import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useState } from 'react';

import { summaryMonthFromNotification } from '@/features/insights/monthly-summary/reminder/monthly-summary-reminder';
import { useMonthlySummaryReminder } from '@/features/insights/monthly-summary/reminder/use-monthly-summary-reminder';
import { canOpenMonthlyReport, type PremiumReason } from '@/features/settings/premium/premium-access';
import type { PremiumStatus } from '@/features/settings/premium/use-premium';
import { usePrivacy } from '@/features/settings/privacy/privacy-provider';

interface MonthlySummaryLauncherOptions {
  premium: PremiumStatus | undefined;
  onOpen: () => void;
  openPremium: (reason: PremiumReason) => void;
}

export function useMonthlySummaryLauncher({ premium, onOpen, openPremium }: MonthlySummaryLauncherOptions) {
  const reminder = useMonthlySummaryReminder(premium?.isPremium);
  const { confirmPermission } = reminder;
  const [summaryMonthKey, setSummaryMonthKey] = useState<string | null>(null);
  const { lockReason } = usePrivacy();
  const isUnlocked = lockReason === null;

  const openMonthlySummary = useCallback(
    (month: string | null = null) => {
      if (!canOpenMonthlyReport(premium?.isPremium === true)) {
        openPremium('report');
        return;
      }

      void confirmPermission();
      setSummaryMonthKey(month);
      onOpen();
    },
    [confirmPermission, onOpen, openPremium, premium?.isPremium],
  );
  const openReport = useCallback(() => openMonthlySummary(null), [openMonthlySummary]);

  useEffect(() => {
    if (premium === undefined || !isUnlocked) {
      return;
    }

    let isActive = true;
    const openFromNotification = (response: Notifications.NotificationResponse | null) => {
      const month = summaryMonthFromNotification(response);

      if (month !== null) {
        Notifications.clearLastNotificationResponse();
        openMonthlySummary(month);
      }
    };

    Promise.resolve().then(() => {
      if (isActive) {
        openFromNotification(Notifications.getLastNotificationResponse());
      }
    });
    const subscription = Notifications.addNotificationResponseReceivedListener(openFromNotification);

    return () => {
      isActive = false;
      subscription.remove();
    };
  }, [isUnlocked, openMonthlySummary, premium]);

  return { reminder, summaryMonthKey, openReport };
}

export type MonthlySummaryLauncher = ReturnType<typeof useMonthlySummaryLauncher>;
