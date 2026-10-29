import type { PremiumStatus, StoreSubscriptionStatus } from './use-premium';

export interface ProfilePremium {
  isPremium: boolean;
  premiumSince?: number | null;
  premiumUntil?: number | null;
  subscription?: StoreSubscriptionStatus | null;
}

export function premiumStatusFrom(profile: ProfilePremium): PremiumStatus {
  return {
    isPremium: profile.isPremium,
    premiumSince: profile.premiumSince ?? null,
    premiumUntil: profile.premiumUntil ?? null,
    subscription: profile.subscription ?? null,
  };
}
