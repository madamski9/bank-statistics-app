import * as Notifications from 'expo-notifications';

import { calendarCopy } from '@/features/localization/calendar-copy';
import { currentCopy } from '@/features/localization/language';

import { monthKey, monthOf, shiftMonth } from './monthly-summary';
import { monthlySummaryCopy } from './monthly-summary-copy';
import { nextReminderDate } from './reminder-schedule';

export const monthlySummaryNotificationKind = 'monthlySummary';

const reminderIdentifier = 'bankstats-monthly-summary';

export async function scheduleMonthlySummaryReminder(now: Date): Promise<void> {
  const copy = currentCopy(monthlySummaryCopy);
  const reminderDate = nextReminderDate(now);
  const summarized = shiftMonth(monthOf(reminderDate), -1);
  const monthName = currentCopy(calendarCopy).monthNames[summarized.month] ?? '';

  await Notifications.cancelScheduledNotificationAsync(reminderIdentifier);
  await Notifications.scheduleNotificationAsync({
    identifier: reminderIdentifier,
    content: {
      title: copy.notificationTitle(monthName),
      body: copy.notificationBody,
      data: { kind: monthlySummaryNotificationKind, month: monthKey(summarized) },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: reminderDate,
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

  if (data?.kind !== monthlySummaryNotificationKind || typeof data.month !== 'string') {
    return null;
  }

  return data.month;
}
