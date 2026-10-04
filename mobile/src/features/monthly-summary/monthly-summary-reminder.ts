import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { currentCopy } from '@/features/localization/language';

import { parseMonthKey } from './monthly-summary';
import { monthlySummaryCopy } from './monthly-summary-copy';
import { monthForReminder } from './reminder-month';

export const monthlySummaryNotificationKind = 'monthlySummary';

const reminderIdentifier = 'bankstats-monthly-summary';
const reminderChannel = 'monthly-report';

export async function scheduleMonthlySummaryReminder(): Promise<void> {
  const copy = currentCopy(monthlySummaryCopy);

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(reminderChannel, {
      name: copy.notificationChannel,
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: null,
    });
  }

  await Notifications.cancelScheduledNotificationAsync(reminderIdentifier);
  await Notifications.scheduleNotificationAsync({
    identifier: reminderIdentifier,
    content: {
      title: copy.notificationTitle,
      body: copy.notificationBody,
      data: { kind: monthlySummaryNotificationKind },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
      day: 1,
      hour: 9,
      minute: 0,
      ...(Platform.OS === 'android' ? { channelId: reminderChannel } : {}),
    },
  });
}

export async function cancelMonthlySummaryReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(reminderIdentifier);
}

export function summaryMonthFromNotification(
  response: Notifications.NotificationResponse | null,
): string | null {
  const data = response?.notification.request.content.data;

  if (data?.kind !== monthlySummaryNotificationKind || response === null) {
    return null;
  }

  if (typeof data.month === 'string' && parseMonthKey(data.month) !== null) {
    return data.month;
  }

  return monthForReminder(response.notification.date);
}
