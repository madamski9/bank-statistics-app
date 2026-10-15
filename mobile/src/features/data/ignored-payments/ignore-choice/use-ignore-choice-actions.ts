import { useEffect, useState } from 'react';
import { interpolateColor, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useCopy } from '@/features/app-shell/localization/language';
import { impactLight, selectionChanged } from '@/haptics';

import { ignoredPaymentsCopy } from '../ignored-payments-copy';
import type { IgnoreMatch, IgnoreRule, IgnoreTarget } from '../ignore-rule';

const disarmAfterMs = 4000;

export type IgnoreMode = 'everything' | 'fromToday';
type Busy = IgnoreMode | 'stop' | null;
export type IgnoreOutcome = IgnoreMode | 'stopped';

export interface IgnoreChoiceTarget extends IgnoreTarget {
  match: IgnoreMatch;
  historyCount: number;
  rule: IgnoreRule | null;
}

interface IgnoreChoiceActionsOptions {
  target: IgnoreChoiceTarget;
  onIgnore: (rule: IgnoreRule) => Promise<void>;
  onStopIgnoring: (target: IgnoreTarget) => Promise<void>;
  onDone: (outcome: IgnoreOutcome) => void;
}

export function useIgnoreChoiceActions({ target, onIgnore, onStopIgnoring, onDone }: IgnoreChoiceActionsOptions) {
  const copy = useCopy(ignoredPaymentsCopy);
  const [busy, setBusy] = useState<Busy>(null);
  const [isArmed, setIsArmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const armed = useSharedValue(0);

  useEffect(() => {
    armed.set(withTiming(isArmed ? 1 : 0, { duration: 220, reduceMotion: ReduceMotion.System }));

    if (!isArmed) {
      return;
    }

    const timer = setTimeout(() => setIsArmed(false), disarmAfterMs);

    return () => clearTimeout(timer);
  }, [armed, isArmed]);

  const armedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      armed.get(),
      [0, 1],
      ['rgba(255, 92, 122, 0.08)', 'rgba(255, 92, 122, 0.22)'],
    ),
    borderColor: interpolateColor(
      armed.get(),
      [0, 1],
      ['rgba(255, 92, 122, 0.25)', 'rgba(255, 92, 122, 0.7)'],
    ),
  }));

  const run = async (next: Exclude<Busy, null>, operation: () => Promise<void>) => {
    setBusy(next);
    setError(null);

    try {
      await operation();
      impactLight();
      onDone(next === 'stop' ? 'stopped' : next);
    } catch {
      setError(copy.saveFailed);
      setBusy(null);
    }
  };

  const choose = (mode: IgnoreMode) => {
    if (mode === 'everything' && !isArmed) {
      selectionChanged();
      setIsArmed(true);
      return;
    }

    const rule: IgnoreRule = {
      kind: target.kind,
      name: target.name,
      match: target.match,
      ...(mode === 'everything' ? {} : { since: new Date().toISOString() }),
    };

    void run(mode, () => onIgnore(rule));
  };

  const stop = () => {
    const rule = target.rule;

    if (rule !== null) {
      void run('stop', () => onStopIgnoring(rule));
    }
  };

  return { busy, isBusy: busy !== null, isArmed, error, armedStyle, choose, stop };
}
