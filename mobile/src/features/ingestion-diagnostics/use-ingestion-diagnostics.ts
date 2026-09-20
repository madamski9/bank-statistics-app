import {
  getIngestionStorageDiagnostics,
  ingestSyntheticApplePayTransaction,
  ingestSyntheticMillenniumNotification,
  listIngestionRecords,
  type IngestionRecord,
  type StorageDiagnostics,
} from '@bankstats/ingestion-native';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';

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

  const ingestSyntheticApplePay = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await ingestSyntheticApplePayTransaction();
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

  // The Millennium notification automation writes to the outbox from a background App
  // Intent while this screen may already be mounted from an earlier launch. Without this,
  // a capture that happened while BankStats was merely backgrounded (not relaunched) never
  // appears until the next cold start, which reads as "nothing happened".
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

  return { error, ingestSynthetic, ingestSyntheticApplePay, isLoading, records, refresh, storage };
}
