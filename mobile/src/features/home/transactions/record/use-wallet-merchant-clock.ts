import type { IngestionRecord } from '@bankstats/ingestion-native';
import { useEffect, useState } from 'react';

import { walletMerchantDeadline } from './transaction-record';

export function useWalletMerchantClock(record: IngestionRecord): number {
  const [now, setNow] = useState(() => Date.now());
  const deadline = walletMerchantDeadline(record);

  useEffect(() => {
    if (deadline === null) {
      return;
    }

    const timer = setTimeout(() => setNow(Date.now()), Math.max(deadline - Date.now(), 0));

    return () => clearTimeout(timer);
  }, [deadline]);

  return now;
}
