import { describe, expect, test } from 'bun:test';

import { shouldShowReleaseNotes } from './release-notes';

const betaTester = {
  hasCompletedOnboarding: true,
  hasSeenReleaseNotes: false,
  lane: 'preview',
  platform: 'ios',
};

describe('shouldShowReleaseNotes', () => {
  test('shows once to a beta tester on iPhone who finished onboarding before', () => {
    expect(shouldShowReleaseNotes(betaTester)).toBe(true);
    expect(shouldShowReleaseNotes({ ...betaTester, lane: 'development' })).toBe(true);
  });

  test('stays hidden after it was seen, before onboarding ends, in production and off iPhone', () => {
    expect(shouldShowReleaseNotes({ ...betaTester, hasSeenReleaseNotes: true })).toBe(false);
    expect(shouldShowReleaseNotes({ ...betaTester, hasCompletedOnboarding: false })).toBe(false);
    expect(shouldShowReleaseNotes({ ...betaTester, lane: 'production' })).toBe(false);
    expect(shouldShowReleaseNotes({ ...betaTester, platform: 'android' })).toBe(false);
  });
});
