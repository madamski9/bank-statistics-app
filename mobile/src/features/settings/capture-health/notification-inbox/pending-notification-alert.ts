import type { NotificationResponse } from 'expo-notifications';

export const pendingNotificationAlertKind = 'notificationInbox';

export function opensNotificationInbox(response: NotificationResponse | null): boolean {
  return response?.notification.request.content.data?.kind === pendingNotificationAlertKind;
}
