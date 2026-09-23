import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { AlertNotifier } from './alert-runner';

const alertChannel = 'spending-limits';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function requestAlertPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(alertChannel, {
      name: 'Limity wydatków',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: null,
    });
  }

  const current = await Notifications.getPermissionsAsync();

  if (current.granted || current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return true;
  }

  if (!current.canAskAgain) {
    return false;
  }

  const requested = await Notifications.requestPermissionsAsync();

  return (
    requested.granted ||
    requested.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}

export const expoAlertNotifier: AlertNotifier = {
  ensurePermission: requestAlertPermission,
  present: async (message) => {
    await Notifications.scheduleNotificationAsync({
      content: { title: message.title, body: message.body },
      trigger: Platform.OS === 'android' ? { channelId: alertChannel } : null,
    });
  },
};
