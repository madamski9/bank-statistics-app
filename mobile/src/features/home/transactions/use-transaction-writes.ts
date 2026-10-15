import {
  deleteIngestionRecord,
  saveIngestionRecord,
  type IngestionRecord,
} from '@bankstats/ingestion-native';
import { useCallback, useRef, useState } from 'react';

export interface TransactionWrites {
  error: string | null;
  isWriting: boolean;
  save: (record: IngestionRecord) => Promise<boolean>;
  remove: (id: string) => Promise<boolean>;
  clearError: () => void;
}

export function useTransactionWrites(onChanged: () => void | Promise<void>): TransactionWrites {
  const [error, setError] = useState<string | null>(null);
  const [isWriting, setIsWriting] = useState(false);
  const isRunning = useRef(false);

  const run = useCallback(
    async (operation: () => Promise<unknown>) => {
      if (isRunning.current) {
        return false;
      }

      isRunning.current = true;
      setIsWriting(true);
      setError(null);

      try {
        await operation();
        await onChanged();

        return true;
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : String(caughtError));

        return false;
      } finally {
        isRunning.current = false;
        setIsWriting(false);
      }
    },
    [onChanged],
  );

  const save = useCallback(
    (record: IngestionRecord) => run(() => saveIngestionRecord(record)),
    [run],
  );

  const remove = useCallback((id: string) => run(() => deleteIngestionRecord(id)), [run]);

  const clearError = useCallback(() => setError(null), []);

  return { error, isWriting, save, remove, clearError };
}
