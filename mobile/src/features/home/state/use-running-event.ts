import { useCallback, useMemo, useState } from 'react';

import type { IngestionRecord } from '@bankstats/ingestion-native';

import type { CategorizationRule } from '@/features/data/classification/categorization-rule';
import { summarizeEvent } from '@/features/insights/events/event-summary';
import { activeEvent } from '@/features/insights/events/spending-event';
import type { SpendingEvents } from '@/features/insights/events/use-events';
import type { PremiumReason } from '@/features/settings/premium/premium-access';

interface RunningEventOptions {
  countedRecords: IngestionRecord[];
  rules: CategorizationRule[];
  spendingEvents: SpendingEvents;
  onOpenEvents: () => void;
  openPremium: (reason: PremiumReason) => void;
}

export function useRunningEvent({ countedRecords, rules, spendingEvents, onOpenEvents, openPremium }: RunningEventOptions) {
  const runningEvent = useMemo(() => activeEvent(spendingEvents.events), [spendingEvents.events]);
  const runningEventSummary = useMemo(
    () =>
      runningEvent === null
        ? null
        : summarizeEvent(countedRecords, runningEvent, spendingEvents.events, rules, new Date()),
    [countedRecords, rules, runningEvent, spendingEvents.events],
  );
  const [isEventFocused, setIsEventFocused] = useState(true);
  const [eventsSheetTarget, setEventsSheetTarget] = useState<string | null>(null);
  const [showsEventHistory, setShowsEventHistory] = useState(false);
  const { start: startSpendingEvent } = spendingEvents;

  const startEvent = useCallback(
    async (name: string) => {
      const started = await startSpendingEvent(name);
      setIsEventFocused(true);

      return started;
    },
    [startSpendingEvent],
  );
  const requireEventPremium = useCallback(() => openPremium('event'), [openPremium]);
  const toggleEventFocus = useCallback(() => setIsEventFocused((current) => !current), []);
  const openEvents = useCallback(() => {
    setEventsSheetTarget(runningEvent?.id ?? null);
    setShowsEventHistory(runningEvent === null);
    onOpenEvents();
  }, [onOpenEvents, runningEvent]);
  const openEventHistory = useCallback(() => {
    setEventsSheetTarget(null);
    setShowsEventHistory(true);
    onOpenEvents();
  }, [onOpenEvents]);

  return {
    runningEventSummary,
    isEventFocused,
    eventsSheetTarget,
    showsEventHistory,
    startEvent,
    requireEventPremium,
    toggleEventFocus,
    openEvents,
    openEventHistory,
  };
}

export type RunningEventState = ReturnType<typeof useRunningEvent>;
