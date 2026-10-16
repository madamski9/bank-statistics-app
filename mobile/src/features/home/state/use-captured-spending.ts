import {
  deleteSyntheticIngestionRecords,
  isSyntheticIngestionRecord,
  listIngestionRecords,
  type IngestionRecord,
} from '@bankstats/ingestion-native';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';

async function loadRealRecords(): Promise<IngestionRecord[]> {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    return [];
  }

  await deleteSyntheticIngestionRecords();
  const records = await listIngestionRecords();

  return records.filter((record) => !isSyntheticIngestionRecord(record));
}

export function useCapturedSpending() {
  const [records, setRecords] = useState<IngestionRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setError(null);

    try {
      setRecords(await loadRealRecords());
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : String(caughtError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isActive = true;

    loadRealRecords()
      .then((nextRecords) => {
        if (isActive) {
          setRecords(nextRecords);
        }
      })
      .catch((caughtError: unknown) => {
        if (isActive) {
          setError(caughtError instanceof Error ? caughtError.message : String(caughtError));
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void refresh();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [refresh]);

  return { error, isLoading, records, refresh };
}
