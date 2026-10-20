import { describe, expect, test } from 'bun:test';

import { releaseNotesKey, releaseNotesPages, shouldShowReleaseNotes } from './release-notes';

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

describe('notification recovery release notes', () => {
  test('notifies existing testers independently of the previous release and account', () => {
    expect(releaseNotesKey('tester')).not.toBe('bankstats.release-notes.1.0.9.tester');
    expect(releaseNotesKey('tester')).not.toBe('bankstats.release-notes.notification-recovery.v1.tester');
    expect(releaseNotesKey('tester')).not.toBe(releaseNotesKey('another-tester'));
  });

  test('shows recovery before an optional sign-out and keeps sign-in guidance second', () => {
    expect(releaseNotesPages[0]).toBe('notificationRecovery');
    expect(releaseNotesPages[1]).toBe('signInAgain');
    expect(releaseNotesPages).toContain('alertTone');
  });
});
