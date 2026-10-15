import {
  deleteSyntheticIngestionRecords,
  getIngestionStorageDiagnostics,
  ingestSyntheticApplePayTransaction,
  type IngestionRecord,
  type StorageDiagnostics,
} from '@bankstats/ingestion-native';
import { useAuth } from '@clerk/expo';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

import { readSelectedBanks } from '@/features/onboarding/selected-banks';

import { captureHealth, type CaptureHealth } from './capture-health';

export type SelfTest = { state: 'idle' | 'running' | 'passed' } | { state: 'failed'; reason: string };

export interface CaptureHealthState {
  health: CaptureHealth;
  selfTest: SelfTest;
  runSelfTest: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useCaptureHealth(records: IngestionRecord[]): CaptureHealthState {
  const { userId } = useAuth();
  const [diagnostics, setDiagnostics] = useState<StorageDiagnostics | null>(null);
  const [enabledBanks, setEnabledBanks] = useState<string[]>([]);
  const [selfTest, setSelfTest] = useState<SelfTest>({ state: 'idle' });

  const load = useCallback(
    () =>
      Promise.all([
        getIngestionStorageDiagnostics().catch(() => null),
        userId == null ? Promise.resolve([]) : readSelectedBanks(userId),
      ]),
    [userId],
  );

  const refresh = useCallback(async () => {
    if (Platform.OS !== 'ios') {
      return;
    }

    const [nextDiagnostics, banks] = await load();
    setDiagnostics(nextDiagnostics);
    setEnabledBanks(banks);
  }, [load]);

  useEffect(() => {
    if (Platform.OS !== 'ios') {
      return;
    }

    let isActive = true;

    void load().then(([nextDiagnostics, banks]) => {
      if (isActive) {
        setDiagnostics(nextDiagnostics);
        setEnabledBanks(banks);
      }
    });

    return () => {
      isActive = false;
    };
  }, [load]);

  const runSelfTest = useCallback(async () => {
    setSelfTest({ state: 'running' });

    try {
      await ingestSyntheticApplePayTransaction();
      await deleteSyntheticIngestionRecords();
      setSelfTest({ state: 'passed' });
    } catch (caught) {
      setSelfTest({ state: 'failed', reason: caught instanceof Error ? caught.message : String(caught) });
    }

    await refresh();
  }, [refresh]);

  const health = useMemo(
    () => captureHealth({ records, diagnostics, enabledBanks, now: new Date() }),
    [diagnostics, enabledBanks, records],
  );

  return { health, selfTest, runSelfTest, refresh };
}
