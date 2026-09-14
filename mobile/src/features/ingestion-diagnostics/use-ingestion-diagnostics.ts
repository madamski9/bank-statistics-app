import {
  getIngestionStorageDiagnostics,
  ingestSyntheticMillenniumNotification,
  listIngestionRecords,
  type IngestionRecord,
} from '@bankstats/ingestion-native';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

interface StorageDiagnostics {
  cipherVersion: string;
  databasePath: string;
}

export function useIngestionDiagnostics() {
  const [records, setRecords] = useState<IngestionRecord[]>([]);
  const [storage, setStorage] = useState<StorageDiagnostics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(Platform.OS === 'ios');

  const refresh = useCallback(async () => {
    if (Platform.OS !== 'ios') {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [nextRecords, nextStorage] = await Promise.all([
        listIngestionRecords(),
        getIngestionStorageDiagnostics(),
      ]);
      setRecords(nextRecords);
      setStorage(nextStorage);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : String(caughtError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const ingestSynthetic = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await ingestSyntheticMillenniumNotification();
      await refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : String(caughtError));
      setIsLoading(false);
    }
  }, [refresh]);

  useEffect(() => {
    if (Platform.OS !== 'ios') {
      return;
    }

    let isActive = true;

    void Promise.all([listIngestionRecords(), getIngestionStorageDiagnostics()])
      .then(([nextRecords, nextStorage]) => {
        if (isActive) {
          setRecords(nextRecords);
          setStorage(nextStorage);
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

  return { error, ingestSynthetic, isLoading, records, refresh, storage };
}
