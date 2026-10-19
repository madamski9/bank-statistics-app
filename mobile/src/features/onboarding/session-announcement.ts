export interface SessionAnnouncementContext {
  hasCompletedOnboarding: boolean;
  hasSeenAnnouncement: boolean;
  lane: string;
  session: { createdAt: Date; expireAt: Date } | null | undefined;
}

const lastingSessionMs = 365 * 86_400_000;

export function sessionAnnouncementKey(userId: string): string {
  return `bankstats.session-announcement.v1.${userId}`;
}

export function hasExpiringSession(session: SessionAnnouncementContext['session']): boolean {
  if (session == null) {
    return false;
  }

  const lifetimeMs = session.expireAt.getTime() - session.createdAt.getTime();

  return Number.isFinite(lifetimeMs) && lifetimeMs < lastingSessionMs;
}

export function shouldShowSessionAnnouncement(context: SessionAnnouncementContext): boolean {
  return (
    context.hasCompletedOnboarding &&
    !context.hasSeenAnnouncement &&
    context.lane !== 'production' &&
    hasExpiringSession(context.session)
  );
}
