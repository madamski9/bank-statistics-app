export interface ReleaseNotesContext {
  hasCompletedOnboarding: boolean;
  hasSeenReleaseNotes: boolean;
  lane: string;
  platform: string;
}

export function releaseNotesKey(userId: string): string {
  return `bankstats.release-notes.1.0.9.${userId}`;
}

export function shouldShowReleaseNotes(context: ReleaseNotesContext): boolean {
  return (
    context.hasCompletedOnboarding &&
    !context.hasSeenReleaseNotes &&
    context.lane !== 'production' &&
    context.platform === 'ios'
  );
}
