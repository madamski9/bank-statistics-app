import { api } from '@bankstats/convex/convex/_generated/api';
import { useConvexAuth, useQuery } from 'convex/react';

import { usePreviewPremiumLoading, usePreviewWithoutPremium } from './premium-preview';

export interface PremiumStatus {
  isPremium: boolean;
  premiumSince: number | null;
  premiumUntil: number | null;
}

const withoutPremium: PremiumStatus = { isPremium: false, premiumSince: null, premiumUntil: null };

export function usePremium(): PremiumStatus | undefined {
  const { isAuthenticated } = useConvexAuth();
  const isPreviewingWithoutPremium = usePreviewWithoutPremium();
  const isPreviewingLoading = usePreviewPremiumLoading();
  const status = useQuery(api.profiles.current, isAuthenticated ? {} : 'skip');

  if (isPreviewingLoading) {
    return undefined;
  }

  if (status !== undefined && isPreviewingWithoutPremium) {
    return withoutPremium;
  }

  return status;
}
