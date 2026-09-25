import { api } from '@bankstats/convex/convex/_generated/api';
import { useConvexAuth, useQuery } from 'convex/react';

import { usePreviewWithoutPremium } from './premium-preview';

export interface PremiumStatus {
  isPremium: boolean;
  premiumSince: number | null;
}

const withoutPremium: PremiumStatus = { isPremium: false, premiumSince: null };

export function usePremium(): PremiumStatus | undefined {
  const { isAuthenticated } = useConvexAuth();
  const isPreviewingWithoutPremium = usePreviewWithoutPremium();
  const status = useQuery(api.profiles.current, isAuthenticated ? {} : 'skip');

  if (status !== undefined && isPreviewingWithoutPremium) {
    return withoutPremium;
  }

  return status;
}
