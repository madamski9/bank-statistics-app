import { useCallback, useState } from 'react';

import type { PremiumReason } from '@/features/settings/premium/premium-access';

import type { HomeSheetKey } from '@/features/home/sheets/home-sheet-key';

export function useHomeSheets() {
  const [activeSheet, setActiveSheet] = useState<HomeSheetKey | null>(null);
  const [premiumReason, setPremiumReason] = useState<PremiumReason | null>(null);
  const [premiumReturnSheet, setPremiumReturnSheet] = useState<HomeSheetKey | null>(null);
  const [inboxRequest, setInboxRequest] = useState<number | null>(null);

  const openSheet = useCallback((sheet: HomeSheetKey | null) => {
    setInboxRequest(null);
    setActiveSheet(sheet);
  }, []);

  const openNotificationInbox = useCallback(() => {
    setInboxRequest((request) => (request ?? 0) + 1);
    setActiveSheet('captureHealth');
  }, []);

  const openPremium = useCallback(
    (reason: PremiumReason | null) => {
      setPremiumReason(reason);
      setPremiumReturnSheet(activeSheet === 'premium' ? null : activeSheet);
      setActiveSheet('premium');
    },
    [activeSheet],
  );

  const closeSheet = useCallback(() => openSheet(null), [openSheet]);
  const closePremium = useCallback(() => openSheet(premiumReturnSheet), [openSheet, premiumReturnSheet]);

  return {
    activeSheet,
    premiumReason,
    inboxRequest,
    openSheet,
    openNotificationInbox,
    closeSheet,
    openPremium,
    closePremium,
  };
}

export type HomeSheets = ReturnType<typeof useHomeSheets>;
