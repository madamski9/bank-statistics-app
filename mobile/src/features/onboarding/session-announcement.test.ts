import { describe, expect, test } from 'bun:test';

import { shouldShowSessionAnnouncement } from './session-announcement';

const signedInAt = new Date('2026-10-16T19:00:00.000Z');
const weekLater = new Date('2026-10-23T19:00:00.000Z');
const decadeLater = new Date('2036-10-16T19:00:00.000Z');

const betaTester = {
  hasCompletedOnboarding: true,
  hasSeenAnnouncement: false,
  lane: 'preview',
  session: { createdAt: signedInAt, expireAt: weekLater },
};

describe('shouldShowSessionAnnouncement', () => {
  test('asks a beta tester still on a week-long session to sign in again', () => {
    expect(shouldShowSessionAnnouncement(betaTester)).toBe(true);
    expect(shouldShowSessionAnnouncement({ ...betaTester, lane: 'development' })).toBe(true);
  });

  test('stays hidden once the tester signed in again and the session no longer expires', () => {
    expect(
      shouldShowSessionAnnouncement({ ...betaTester, session: { createdAt: signedInAt, expireAt: decadeLater } }),
    ).toBe(false);
  });

  test('stays hidden after it was dismissed, before onboarding ends, in production and without a session', () => {
    expect(shouldShowSessionAnnouncement({ ...betaTester, hasSeenAnnouncement: true })).toBe(false);
    expect(shouldShowSessionAnnouncement({ ...betaTester, hasCompletedOnboarding: false })).toBe(false);
    expect(shouldShowSessionAnnouncement({ ...betaTester, lane: 'production' })).toBe(false);
    expect(shouldShowSessionAnnouncement({ ...betaTester, session: null })).toBe(false);
  });
});
