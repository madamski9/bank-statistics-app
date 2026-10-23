import type { premiumCopy } from './premium-copy';
import { formatPremiumDate } from './premium-date';
import type { PremiumStatus } from './use-premium';

export type PremiumStanding =
  | { kind: 'free' }
  | { kind: 'thanks' }
  | { kind: 'since'; date: number }
  | { kind: 'until'; date: number }
  | { kind: 'trial'; date: number }
  | { kind: 'renews'; date: number }
  | { kind: 'ends'; date: number }
  | { kind: 'billingIssue'; date: number };

export function premiumStanding(status: PremiumStatus): PremiumStanding {
  if (!status.isPremium) {
    return { kind: 'free' };
  }

  const subscription = status.subscription;

  if (subscription !== null && subscription.accessUntil !== null) {
    const date = subscription.accessUntil;

    if (subscription.hasBillingIssue) {
      return { kind: 'billingIssue', date };
    }

    if (subscription.isTrial && subscription.willRenew) {
      return { kind: 'trial', date };
    }

    return subscription.willRenew ? { kind: 'renews', date } : { kind: 'ends', date };
  }

  if (subscription === null && status.premiumUntil !== null) {
    return { kind: 'until', date: status.premiumUntil };
  }

  if (subscription === null && status.premiumSince !== null) {
    return { kind: 'since', date: status.premiumSince };
  }

  return { kind: 'thanks' };
}

type PremiumCopy = (typeof premiumCopy)['pl'];

export function premiumStandingText(standing: PremiumStanding, copy: PremiumCopy): string {
  switch (standing.kind) {
    case 'free':
      return copy.pitch;
    case 'thanks':
      return copy.thanks;
    case 'since':
      return copy.activeSince(formatPremiumDate(standing.date));
    case 'until':
    case 'ends':
      return copy.activeUntil(formatPremiumDate(standing.date));
    case 'trial':
      return copy.trialUntil(formatPremiumDate(standing.date));
    case 'renews':
      return copy.renewsOn(formatPremiumDate(standing.date));
    case 'billingIssue':
      return copy.billingIssue;
  }
}

export function premiumStandingDetail(standing: PremiumStanding, copy: PremiumCopy): string {
  switch (standing.kind) {
    case 'free':
      return copy.tagline;
    case 'thanks':
      return copy.thanksLong;
    case 'since':
      return copy.activeSinceLong(formatPremiumDate(standing.date));
    case 'until':
      return copy.activeUntilLong(formatPremiumDate(standing.date));
    case 'ends':
      return copy.endsOnLong(formatPremiumDate(standing.date));
    case 'trial':
      return copy.trialUntilLong(formatPremiumDate(standing.date));
    case 'renews':
      return copy.renewsOnLong(formatPremiumDate(standing.date));
    case 'billingIssue':
      return copy.billingIssueLong(formatPremiumDate(standing.date));
  }
}
