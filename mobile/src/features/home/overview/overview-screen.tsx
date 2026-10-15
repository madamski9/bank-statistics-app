import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { overviewSpacing, type BubbleKey } from '@/features/app-shell/theme/overview-theme';
import { EventBanner } from '@/features/insights/events/event-banner/event-banner';
import type { EventSummary } from '@/features/insights/events/event-summary';
import type { SpendingEvent } from '@/features/insights/events/spending-event';

import { BubbleField } from './bubbles/bubble-field';
import type { BubbleOrigin } from './bubbles/glass-bubble';
import { OverviewHeader } from './components/overview-header';
import { OverviewStatus } from './components/overview-status';
import type { SpendingPeriod } from './period/periods';
import { OverviewShortcuts, type OverviewShortcutsProps } from './shortcuts/overview-shortcuts';
import type { SpendingSummary } from './spending/spending-summary';
import { useOverviewBubbles } from './use-overview-bubbles';

interface OverviewScreenProps extends OverviewShortcutsProps {
  summary: SpendingSummary;
  expenseChange: number | null;
  period: SpendingPeriod;
  onChangePeriod: (period: SpendingPeriod) => void;
  lockedPeriods: ReadonlySet<SpendingPeriod>;
  onSelectBubble: (key: BubbleKey, origin: BubbleOrigin) => void;
  error: string | null;
  isLoading: boolean;
  hasData: boolean;
  runningEvent: EventSummary | null;
  isEventFocused: boolean;
  canStartEvent: boolean;
  onRequireEventPremium: () => void;
  onToggleEventFocus: () => void;
  onStartEvent: (name: string) => Promise<SpendingEvent>;
  onOpenEvents: () => void;
}

function OverviewScreenComponent({
  summary,
  expenseChange,
  period,
  onChangePeriod,
  lockedPeriods,
  onSelectBubble,
  error,
  isLoading,
  hasData,
  runningEvent,
  isEventFocused,
  canStartEvent,
  onRequireEventPremium,
  onToggleEventFocus,
  onStartEvent,
  onOpenEvents,
  ...shortcuts
}: OverviewScreenProps) {
  const insets = useSafeAreaInsets();
  const focusedEvent = isEventFocused ? runningEvent : null;
  const bubbles = useOverviewBubbles({ summary, period, isLoading, hasData, focusedEvent });

  return (
    <View style={styles.page}>
      <OverviewHeader
        expenseChange={expenseChange}
        focusedEvent={focusedEvent}
        lockedPeriods={lockedPeriods}
        onChangePeriod={onChangePeriod}
        period={period}
      />

      <BubbleField
        bubbles={bubbles}
        variant={focusedEvent === null ? 'period' : `event-${focusedEvent.event.id}`}
        onSelect={focusedEvent === null ? onSelectBubble : onOpenEvents}
      />

      <OverviewStatus error={error} hasData={hasData} isLoading={isLoading} />

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <EventBanner
          canStartEvent={canStartEvent}
          isEventFocused={isEventFocused}
          onRequirePremium={onRequireEventPremium}
          onOpenEvents={onOpenEvents}
          onStartEvent={onStartEvent}
          onToggleEventFocus={onToggleEventFocus}
          runningEvent={runningEvent}
        />
        <OverviewShortcuts {...shortcuts} />
      </View>
    </View>
  );
}

export const OverviewScreen = memo(OverviewScreenComponent);

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  footer: {
    gap: overviewSpacing.tight,
    paddingHorizontal: overviewSpacing.gutter,
  },
});
