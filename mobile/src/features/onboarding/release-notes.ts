export interface ReleaseNotesContext {
  hasCompletedOnboarding: boolean;
  hasSeenReleaseNotes: boolean;
  lane: string;
  platform: string;
}

export const releaseNotesPages = ['notificationRecovery', 'signInAgain', 'alertTone'] as const;

export function releaseNotesKey(userId: string): string {
  return `bankstats.release-notes.notification-recovery.v1.${userId}`;
}

export function shouldShowReleaseNotes(context: ReleaseNotesContext): boolean {
  return (
    context.hasCompletedOnboarding &&
    !context.hasSeenReleaseNotes &&
    context.lane !== 'production' &&
    context.platform === 'ios'
  );
}
