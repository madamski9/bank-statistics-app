import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';

import { opensNotificationInbox } from '@/features/settings/capture-health/notification-inbox/pending-notification-alert';
import { usePrivacy } from '@/features/settings/privacy/privacy-provider';

export function useNotificationInboxLauncher(onOpen: () => void) {
  const { lockReason } = usePrivacy();
  const isUnlocked = lockReason === null;

  useEffect(() => {
    if (!isUnlocked) {
      return;
    }

    let isActive = true;
    const openFromNotification = (response: Notifications.NotificationResponse | null) => {
      if (opensNotificationInbox(response)) {
        Notifications.clearLastNotificationResponse();
        onOpen();
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
  }, [isUnlocked, onOpen]);
}
