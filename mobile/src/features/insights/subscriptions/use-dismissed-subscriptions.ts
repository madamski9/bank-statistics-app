import { useCallback, useEffect, useMemo, useState } from 'react';

import { readDismissedSubscriptions, writeDismissedSubscriptions } from './dismissed-subscriptions';

export interface DismissedSubscriptions {
  dismissed: ReadonlySet<string>;
  dismiss: (key: string) => Promise<void>;
  restoreAll: () => Promise<void>;
}

export function useDismissedSubscriptions(): DismissedSubscriptions {
  const [keys, setKeys] = useState<string[]>([]);

  useEffect(() => {
    let isActive = true;

    void readDismissedSubscriptions().then((stored) => {
      if (isActive) {
        setKeys(stored);
      }
    });

    return () => {
      isActive = false;
    };
  }, []);

  const dismiss = useCallback(
    async (key: string) => {
      const next = [...new Set([...keys, key])];
      await writeDismissedSubscriptions(next);
      setKeys(next);
    },
    [keys],
  );

  const restoreAll = useCallback(async () => {
    await writeDismissedSubscriptions([]);
    setKeys([]);
  }, []);

  const dismissed = useMemo(() => new Set(keys), [keys]);

  return { dismissed, dismiss, restoreAll };
}
