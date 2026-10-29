import type { IngestionRecord } from '@bankstats/ingestion-native';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { CategorizationRule } from '@/features/data/classification/categorization-rule';

import type { AlertRule } from './rules/alert-rule';
import { activeRules, removeRule, upsertAlertRule } from './rules/alert-rules';
import { runAlerts, type AlertNotifier, type AlertPause } from './delivery/alert-runner';
import { encryptedAlertPauseStorage, type AlertPauseStorage } from './delivery/alert-pause-storage';
import {
  readAlertRules,
  readSentAlerts,
  writeAlertRules,
  writeSentAlerts,
  type AlertStorage,
} from './rules/alert-storage';
import { expoAlertNotifier } from './delivery/expo-alert-notifier';
import { secureAlertStorage } from './rules/secure-alert-storage';

export interface AlertsState {
  rules: AlertRule[];
  activeCount: number;
  save: (rule: AlertRule) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

interface AlertsOptions {
  records: IngestionRecord[];
  categorizationRules: CategorizationRule[];
  isReady?: boolean;
  isPremium?: boolean;
  hasAggressiveTone?: boolean;
  storage?: AlertStorage;
  notifier?: AlertNotifier;
  pauseStorage?: AlertPauseStorage;
}

export function useAlerts({
  records,
  categorizationRules,
  isReady = true,
  isPremium = false,
  hasAggressiveTone = false,
  storage = secureAlertStorage,
  notifier = expoAlertNotifier,
  pauseStorage = encryptedAlertPauseStorage,
}: AlertsOptions): AlertsState {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [runCount, setRunCount] = useState(0);
  const sent = useRef<string[]>([]);
  const missedCaptures = useRef<AlertPause | null>(null);
  const isRunning = useRef(false);
  const missedRun = useRef(false);

  useEffect(() => {
    let isActive = true;
    const resumedAtMs = Date.now();

    void Promise.all([readAlertRules(storage), readSentAlerts(storage), pauseStorage.readPausedSince()]).then(
      ([storedRules, storedSent, pausedSinceMs]) => {
        if (isActive) {
          sent.current = storedSent;
          missedCaptures.current =
            pausedSinceMs === null ? null : { sinceMs: pausedSinceMs, untilMs: resumedAtMs };
          setRules(storedRules);
          setIsLoaded(true);
        }
      },
    );

    return () => {
      isActive = false;
    };
  }, [pauseStorage, storage]);

  useEffect(() => {
    if (!isLoaded || !isReady) {
      return;
    }

    if (activeRules(rules).length === 0 || records.length === 0) {
      if (missedCaptures.current !== null) {
        missedCaptures.current = null;
        void pauseStorage.clearPaused();
      }

      return;
    }

    if (isRunning.current) {
      missedRun.current = true;

      return;
    }

    isRunning.current = true;
    const catchUp = missedCaptures.current;

    void runAlerts(rules, records, {
      reference: new Date(),
      rules: categorizationRules,
      sent: sent.current,
      notifier,
      hasAggressiveTone,
      missedCaptures: catchUp ?? undefined,
    })
      .then(async (nextSent) => {
        if (catchUp !== null) {
          missedCaptures.current = null;
          await pauseStorage.clearPaused();
        }

        if (nextSent === sent.current) {
          return;
        }

        sent.current = nextSent;
        await writeSentAlerts(storage, nextSent);
      })
      .finally(() => {
        isRunning.current = false;

        if (missedRun.current) {
          missedRun.current = false;
          setRunCount((current) => current + 1);
        }
      });
  }, [
    categorizationRules,
    hasAggressiveTone,
    isLoaded,
    isReady,
    notifier,
    pauseStorage,
    records,
    rules,
    runCount,
    storage,
  ]);

  const save = useCallback(
    async (rule: AlertRule) => {
      const next = upsertAlertRule(rules, rule, { isPremium });

      await writeAlertRules(storage, next);
      setRules(next);
    },
    [isPremium, rules, storage],
  );

  const remove = useCallback(
    async (id: string) => {
      const next = removeRule(rules, id);

      await writeAlertRules(storage, next);
      setRules(next);
    },
    [rules, storage],
  );

  return { rules, activeCount: activeRules(rules).length, save, remove };
}
