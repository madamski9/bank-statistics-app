import { deleteIngestionRecord, type IngestionRecord } from '@bankstats/ingestion-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  isIgnored,
  withIgnoreRule,
  withoutIgnoreRule,
  type IgnoreRule,
  type IgnoreTarget,
} from './ignore-rule';
import { readIgnoreRules, writeIgnoreRules } from './ignore-rule-storage';

export interface IgnoredPayments {
  rules: IgnoreRule[];
  keptRecords: IngestionRecord[];
  ignore: (rule: IgnoreRule) => Promise<void>;
  stopIgnoring: (target: IgnoreTarget) => Promise<void>;
}

export function useIgnoredPayments(
  records: IngestionRecord[],
  onRemoved: () => Promise<void>,
): IgnoredPayments {
  const [rules, setRules] = useState<IgnoreRule[]>([]);
  const attempted = useRef(new Set<string>());

  useEffect(() => {
    let isActive = true;

    void readIgnoreRules().then((stored) => {
      if (isActive) {
        setRules(stored);
      }
    });

    return () => {
      isActive = false;
    };
  }, []);

  const ignoredIds = useMemo(
    () => records.filter((record) => isIgnored(record, rules)).map((record) => record.id),
    [records, rules],
  );

  const keptRecords = useMemo(() => {
    if (ignoredIds.length === 0) {
      return records;
    }

    const ignored = new Set(ignoredIds);

    return records.filter((record) => !ignored.has(record.id));
  }, [ignoredIds, records]);

  useEffect(() => {
    const pending = ignoredIds.filter((id) => !attempted.current.has(id));

    if (pending.length === 0) {
      return;
    }

    pending.forEach((id) => attempted.current.add(id));

    void Promise.allSettled(pending.map((id) => deleteIngestionRecord(id))).then(() => onRemoved());
  }, [ignoredIds, onRemoved]);

  const ignore = useCallback(
    async (rule: IgnoreRule) => {
      const next = withIgnoreRule(rules, rule);
      await writeIgnoreRules(next);
      setRules(next);
    },
    [rules],
  );

  const stopIgnoring = useCallback(
    async (target: IgnoreTarget) => {
      const next = withoutIgnoreRule(rules, target);
      await writeIgnoreRules(next);
      setRules(next);
    },
    [rules],
  );

  return { rules, keptRecords, ignore, stopIgnoring };
}
