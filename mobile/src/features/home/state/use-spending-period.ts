import { useCallback, useMemo, useState } from 'react';

import type { SpendingPeriod } from '@/features/home/overview/period/periods';
import { fallbackPeriod, lockedPeriods, type PremiumReason } from '@/features/settings/premium/premium-access';

export function useSpendingPeriod(hasPremiumAccess: boolean, openPremium: (reason: PremiumReason) => void) {
  const [requestedPeriod, setRequestedPeriod] = useState<SpendingPeriod>(fallbackPeriod);
  const periodLocks = useMemo(() => lockedPeriods(hasPremiumAccess), [hasPremiumAccess]);
  const period = periodLocks.has(requestedPeriod) ? fallbackPeriod : requestedPeriod;

  const changePeriod = useCallback(
    (next: SpendingPeriod) => {
      if (periodLocks.has(next)) {
        openPremium('period');
        return;
      }

      setRequestedPeriod(next);
    },
    [openPremium, periodLocks],
  );

  return { period, periodLocks, changePeriod };
}
