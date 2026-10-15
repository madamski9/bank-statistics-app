import {
  deleteSyntheticIngestionRecords,
  isSyntheticIngestionRecord,
  listIngestionRecords,
  type IngestionRecord,
} from '@bankstats/ingestion-native';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';

async function loadRealRecords(): Promise<IngestionRecord[]> {
  await deleteSyntheticIngestionRecords();
  const records = await listIngestionRecords();

  return records.filter((record) => !isSyntheticIngestionRecord(record));
}

export function useCapturedSpending() {
  const [records, setRecords] = useState<IngestionRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(Platform.OS === 'ios');

  const refresh = useCallback(async () => {
    if (Platform.OS !== 'ios') {
      return;
    }

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
    if (Platform.OS !== 'ios') {
      return;
    }

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
    if (Platform.OS !== 'ios') {
      return;
    }

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
