export interface FocusAnnouncementContext {
  hasCompletedOnboarding: boolean;
  hasSeenAnnouncement: boolean;
  lane: string;
  platform: string;
}

export function focusAnnouncementKey(userId: string): string {
  return `bankstats.focus-announcement.v2.${userId}`;
}

export function shouldShowFocusAnnouncement(context: FocusAnnouncementContext): boolean {
  return (
    context.hasCompletedOnboarding &&
    !context.hasSeenAnnouncement &&
    context.lane !== 'production' &&
    context.platform === 'ios'
  );
}
