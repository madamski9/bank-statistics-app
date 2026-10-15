import type { IngestionRecord } from '@bankstats/ingestion-native';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { CategorizationRule } from '@/features/data/classification/categorization-rule';

import type { AlertRule } from './rules/alert-rule';
import { activeRules, removeRule, upsertAlertRule } from './rules/alert-rules';
import { runAlerts, type AlertNotifier } from './delivery/alert-runner';
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
  isPremium?: boolean;
  storage?: AlertStorage;
  notifier?: AlertNotifier;
}

export function useAlerts({
  records,
  categorizationRules,
  isPremium = false,
  storage = secureAlertStorage,
  notifier = expoAlertNotifier,
}: AlertsOptions): AlertsState {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [runCount, setRunCount] = useState(0);
  const sent = useRef<string[]>([]);
  const isRunning = useRef(false);
  const missedRun = useRef(false);

  useEffect(() => {
    let isActive = true;

    void Promise.all([readAlertRules(storage), readSentAlerts(storage)]).then(
      ([storedRules, storedSent]) => {
        if (isActive) {
          sent.current = storedSent;
          setRules(storedRules);
        }
      },
    );

    return () => {
      isActive = false;
    };
  }, [storage]);

  useEffect(() => {
    if (activeRules(rules).length === 0 || records.length === 0) {
      return;
    }

    if (isRunning.current) {
      missedRun.current = true;

      return;
    }

    isRunning.current = true;

    void runAlerts(rules, records, {
      reference: new Date(),
      rules: categorizationRules,
      sent: sent.current,
      notifier,
    })
      .then(async (nextSent) => {
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
  }, [categorizationRules, notifier, records, rules, runCount, storage]);

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
