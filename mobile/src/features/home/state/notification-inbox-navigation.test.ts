import { describe, expect, test } from 'bun:test';

import { canOpenNotificationInbox } from './notification-inbox-navigation';

describe('notification inbox navigation', () => {
  test('opens over the home screen and inside an open Capture sheet', () => {
    expect(canOpenNotificationInbox(null, false)).toBe(true);
    expect(canOpenNotificationInbox('captureHealth', false)).toBe(true);
  });

  test('waits while another sheet or the alert editor is open', () => {
    expect(canOpenNotificationInbox('events', false)).toBe(false);
    expect(canOpenNotificationInbox('premium', false)).toBe(false);
    expect(canOpenNotificationInbox(null, true)).toBe(false);
    expect(canOpenNotificationInbox('captureHealth', true)).toBe(false);
  });
});
