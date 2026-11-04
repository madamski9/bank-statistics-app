import { api } from '@bankstats/convex/convex/_generated/api';
import {
  listIngestionRecords,
  saveIngestionRecord,
  type IngestionRecord,
} from '@bankstats/ingestion-native';
import { useConvex, useConvexAuth } from 'convex/react';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { openLocalDataSession } from '@/features/data/local-storage/local-data-session';
import { queueLocalWrite } from '@/features/data/local-storage/local-write-queue';

import { convertedRecords, pendingRateRequests } from './exchange-rate';

const maximumRequests = 60;
const retryAfterMs = 10 * 60_000;

export function useCurrencyConversion(
  records: IngestionRecord[],
  onConverted: () => void | Promise<void>,
): void {
  const convex = useConvex();
  const { isAuthenticated } = useConvexAuth();
  const isRunning = useRef(false);
  const lastAttempt = useRef<{ key: string; at: number } | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'ios' || !isAuthenticated || isRunning.current) {
      return;
    }

    const requests = pendingRateRequests(records, maximumRequests);

    if (requests.length === 0) {
      return;
    }

    const key = requests.map((request) => `${request.currency}:${request.date}`).join('|');
    const previous = lastAttempt.current;

    if (previous !== null && previous.key === key && Date.now() - previous.at < retryAfterMs) {
      return;
    }

    lastAttempt.current = { key, at: Date.now() };
    isRunning.current = true;
    const session = openLocalDataSession();

    void convex
      .action(api.exchangeRates.snapshots, { requests })
      .then((snapshots) =>
        queueLocalWrite(async () => {
          session.assertCurrent();
          const updated = convertedRecords(await listIngestionRecords(), snapshots);

          for (const record of updated) {
            await session.write(() => saveIngestionRecord(record));
          }

          return updated;
        }),
      )
      .then(async (updated) => {
        if (updated.length > 0) {
          await onConverted();
        }
      })
      .catch(() => undefined)
      .finally(() => {
        isRunning.current = false;
      });
  }, [convex, isAuthenticated, onConverted, records]);
}
