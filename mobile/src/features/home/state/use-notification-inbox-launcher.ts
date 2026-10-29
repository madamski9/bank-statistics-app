import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';

import { opensNotificationInbox } from '@/features/settings/capture-health/notification-inbox/pending-notification-alert';
import { usePrivacy } from '@/features/settings/privacy/privacy-provider';

export function useNotificationInboxLauncher(onOpen: () => void, canOpen: boolean) {
  const { lockReason } = usePrivacy();
  const isUnlocked = lockReason === null;
  const [isRequested, setIsRequested] = useState(false);

  useEffect(() => {
    if (!isUnlocked) {
      return;
    }

    let isActive = true;
    const receive = (response: Notifications.NotificationResponse | null) => {
      if (opensNotificationInbox(response)) {
        setIsRequested(true);
      }
    };

    Promise.resolve().then(() => {
      if (isActive) {
        receive(Notifications.getLastNotificationResponse());
      }
    });
    const subscription = Notifications.addNotificationResponseReceivedListener(receive);

    return () => {
      isActive = false;
      subscription.remove();
    };
  }, [isUnlocked]);

  if (isRequested && isUnlocked && canOpen) {
    setIsRequested(false);
    Notifications.clearLastNotificationResponse();
    onOpen();
  }
}
