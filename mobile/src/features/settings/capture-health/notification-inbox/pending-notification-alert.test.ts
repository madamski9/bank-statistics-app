import { describe, expect, test } from 'bun:test';
import type { NotificationResponse } from 'expo-notifications';

import { opensNotificationInbox } from './pending-notification-alert';

function response(data: Record<string, unknown> | null): NotificationResponse {
  return {
    notification: { request: { content: { data } } },
  } as unknown as NotificationResponse;
}

describe('pending notification alert', () => {
  test('opens the inbox from the native alert', () => {
    expect(opensNotificationInbox(response({ kind: 'notificationInbox' }))).toBe(true);
  });

  test('ignores other notifications', () => {
    expect(opensNotificationInbox(response({ kind: 'monthlySummary' }))).toBe(false);
    expect(opensNotificationInbox(response(null))).toBe(false);
    expect(opensNotificationInbox(null)).toBe(false);
  });
});
