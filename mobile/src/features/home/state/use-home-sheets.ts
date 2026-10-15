import { useCallback, useState } from 'react';

import type { PremiumReason } from '@/features/settings/premium/premium-access';

import type { HomeSheetKey } from '@/features/home/sheets/home-sheet-key';

export function useHomeSheets() {
  const [activeSheet, setActiveSheet] = useState<HomeSheetKey | null>(null);
  const [premiumReason, setPremiumReason] = useState<PremiumReason | null>(null);
  const [premiumReturnSheet, setPremiumReturnSheet] = useState<HomeSheetKey | null>(null);

  const openPremium = useCallback(
    (reason: PremiumReason | null) => {
      setPremiumReason(reason);
      setPremiumReturnSheet(activeSheet === 'premium' ? null : activeSheet);
      setActiveSheet('premium');
    },
    [activeSheet],
  );

  const closeSheet = useCallback(() => setActiveSheet(null), []);
  const closePremium = useCallback(() => setActiveSheet(premiumReturnSheet), [premiumReturnSheet]);

  return {
    activeSheet,
    premiumReason,
    openSheet: setActiveSheet,
    closeSheet,
    openPremium,
    closePremium,
  };
}

export type HomeSheets = ReturnType<typeof useHomeSheets>;
