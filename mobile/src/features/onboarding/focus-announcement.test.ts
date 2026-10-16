import { describe, expect, test } from 'bun:test';

import { shouldShowFocusAnnouncement } from './focus-announcement';

const betaTester = {
  hasCompletedOnboarding: true,
  hasSeenAnnouncement: false,
  lane: 'preview',
  platform: 'ios',
};

describe('shouldShowFocusAnnouncement', () => {
  test('shows once to a beta tester on iPhone who finished onboarding before', () => {
    expect(shouldShowFocusAnnouncement(betaTester)).toBe(true);
    expect(shouldShowFocusAnnouncement({ ...betaTester, lane: 'development' })).toBe(true);
  });

  test('stays hidden after it was seen, before onboarding ends, in production and off iPhone', () => {
    expect(shouldShowFocusAnnouncement({ ...betaTester, hasSeenAnnouncement: true })).toBe(false);
    expect(shouldShowFocusAnnouncement({ ...betaTester, hasCompletedOnboarding: false })).toBe(false);
    expect(shouldShowFocusAnnouncement({ ...betaTester, lane: 'production' })).toBe(false);
    expect(shouldShowFocusAnnouncement({ ...betaTester, platform: 'android' })).toBe(false);
  });
});
