import { useCallback, useEffect, useState } from 'react';

import type { TrackedPayment } from './recurring-payments';
import { readTrackedSubscriptions, writeTrackedSubscriptions } from './tracked-subscriptions';

export interface TrackedSubscriptions {
  tracked: TrackedPayment[];
  track: (payment: TrackedPayment) => Promise<void>;
  untrack: (key: string) => Promise<void>;
}

export function useTrackedSubscriptions(): TrackedSubscriptions {
  const [tracked, setTracked] = useState<TrackedPayment[]>([]);

  useEffect(() => {
    let isActive = true;

    void readTrackedSubscriptions().then((stored) => {
      if (isActive) {
        setTracked(stored);
      }
    });

    return () => {
      isActive = false;
    };
  }, []);

  const track = useCallback(
    async (payment: TrackedPayment) => {
      const next = [...tracked.filter((existing) => existing.key !== payment.key), payment];
      await writeTrackedSubscriptions(next);
      setTracked(next);
    },
    [tracked],
  );

  const untrack = useCallback(
    async (key: string) => {
      const next = tracked.filter((existing) => existing.key !== key);
      await writeTrackedSubscriptions(next);
      setTracked(next);
    },
    [tracked],
  );

  return { tracked, track, untrack };
}
