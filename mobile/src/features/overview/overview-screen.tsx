import { memo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { reportingCurrency } from '@/features/currency-conversion/exchange-rate';
import { EventBanner } from '@/features/events/event-banner';
import { eventTint } from '@/features/events/event-colors';
import type { EventSummary } from '@/features/events/event-summary';
import { eventsCopy } from '@/features/events/events-copy';
import type { SpendingEvent } from '@/features/events/spending-event';
import { AmountText } from '@/features/privacy/amount-text';
import { BubbleField, type BubbleDescriptor } from '@/features/spending-overview/bubble-field';
import { useCopy } from '@/features/localization/language';
import { useAmountFormatting } from '@/features/privacy/use-private-amounts';
import { formatChange, formatTransactionCount } from '@/features/spending-overview/formatting';
import type { BubbleOrigin } from '@/features/spending-overview/glass-bubble';
import {
  overviewColors,
  overviewSpacing,
  type BubbleKey,
} from '@/features/spending-overview/overview-theme';
import { periodOption, type SpendingPeriod } from '@/features/spending-overview/periods';
import { RangeSwitcher } from '@/features/spending-overview/range-switcher';
import type { SpendingSummary } from '@/features/spending-overview/spending-summary';

import { overviewCopy } from './overview-copy';
import { OverviewShortcuts, type OverviewShortcutsProps } from './overview-shortcuts';

const unavailableValue = '-';
const contextEntering = FadeIn.duration(240).delay(80).reduceMotion(ReduceMotion.System);
const contextExiting = FadeOut.duration(160).reduceMotion(ReduceMotion.System);

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
  const { formatAmount, formatCompactAmount, formatSignedCompactAmount } = useAmountFormatting();
  const insets = useSafeAreaInsets();
  const copy = useCopy(overviewCopy);
  const eventCopy = useCopy(eventsCopy);
  const option = periodOption(period);
  const focusedEvent = isEventFocused ? runningEvent : null;

  const amount = (minor: number, compact: boolean, signed = false) => {
    if (!hasData && isLoading) {
      return unavailableValue;
    }

    if (signed) {
      return formatSignedCompactAmount(minor, summary.currency);
    }

    return compact
      ? formatCompactAmount(minor, summary.currency)
      : formatAmount(minor, summary.currency);
  };

  const eventBubbles = (event: EventSummary): BubbleDescriptor[] => {
    const expense = formatAmount(event.expenseMinor, reportingCurrency);
    const income = formatCompactAmount(event.incomeMinor, reportingCurrency);
    const net = formatSignedCompactAmount(event.netMinor, reportingCurrency);
    const count = formatTransactionCount(event.count);

    return [
      {
        key: 'expense',
        label: event.event.name,
        value: expense,
        caption: count,
        tint: eventTint(event.event),
        accessibilityLabel: eventCopy.eventBubbleLabel(event.event.name, expense, count),
      },
      {
        key: 'income',
        label: copy.income,
        value: income,
        accessibilityLabel: eventCopy.eventIncomeLabel(income),
      },
      {
        key: 'net',
        label: copy.net,
        value: net,
        accessibilityLabel: eventCopy.eventNetLabel(net),
      },
    ];
  };

  const periodBubbles: BubbleDescriptor[] = [
    {
      key: 'expense',
      label: copy.expense,
      value: amount(summary.expenseMinor, false),
      caption: formatTransactionCount(summary.expenseCount),
      accessibilityLabel: copy.expenseLabel(
        amount(summary.expenseMinor, false),
        option.label,
        formatTransactionCount(summary.expenseCount),
      ),
    },
    {
      key: 'income',
      label: copy.income,
      value: amount(summary.incomeMinor, true),
      accessibilityLabel: copy.incomeLabel(amount(summary.incomeMinor, true), option.label),
    },
    {
      key: 'net',
      label: copy.net,
      value: amount(summary.netMinor, true, true),
      accessibilityLabel: copy.netLabel(amount(summary.netMinor, true, true), option.label),
    },
  ];

  const bubbles = focusedEvent === null ? periodBubbles : eventBubbles(focusedEvent);

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        {focusedEvent !== null ? (
          <Animated.View
            entering={contextEntering}
            exiting={contextExiting}
            key={`event-${focusedEvent.event.id}`}
            style={styles.contextRow}
          >
            <Text maxFontSizeMultiplier={1.6} numberOfLines={1} style={styles.contextLabel}>
              {eventCopy.eventContext(focusedEvent.event.name)}
            </Text>
            <Text maxFontSizeMultiplier={1.6} style={styles.contextLabel}>
              {eventCopy.days(focusedEvent.days)}
            </Text>
          </Animated.View>
        ) : (
          <Animated.View entering={contextEntering} exiting={contextExiting} key="period" style={styles.contextRow}>
            <AmountText maxFontSizeMultiplier={1.6} style={styles.contextLabel}>
              {copy.context(option.label)}
            </AmountText>
            {expenseChange !== null ? (
              <AmountText
                maxFontSizeMultiplier={1.6}
                style={[
                  styles.contextChange,
                  { color: expenseChange < 0 ? overviewColors.positive : overviewColors.negative },
                ]}
              >
                {expenseChange >= 0 ? '▲' : '▼'} {formatChange(expenseChange)} {copy.versus}{' '}
                {option.previousLabel}
              </AmountText>
            ) : null}
          </Animated.View>
        )}

        <Animated.View
          accessibilityElementsHidden={focusedEvent !== null}
          importantForAccessibility={focusedEvent === null ? 'auto' : 'no-hide-descendants'}
          pointerEvents={focusedEvent === null ? 'auto' : 'none'}
          style={focusedEvent === null ? undefined : styles.rangeSwitcherHidden}
        >
          <RangeSwitcher lockedPeriods={lockedPeriods} onChange={onChangePeriod} period={period} />
        </Animated.View>
      </View>

      <BubbleField
        bubbles={bubbles}
        variant={focusedEvent === null ? 'period' : `event-${focusedEvent.event.id}`}
        onSelect={focusedEvent === null ? onSelectBubble : onOpenEvents}
      />

      {error !== null ? (
        <Text maxFontSizeMultiplier={1.6} style={styles.error}>
          {error}
        </Text>
      ) : Platform.OS !== 'ios' ? (
        <Text maxFontSizeMultiplier={1.6} style={styles.hint}>
          {copy.captureIosOnly}
        </Text>
      ) : !hasData && !isLoading ? (
        <Text maxFontSizeMultiplier={1.6} style={styles.hint}>
          {copy.noTransactions}
        </Text>
      ) : null}

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

/** Memoised so a selection or a page change never rebuilds the bubble field. */
export const OverviewScreen = memo(OverviewScreenComponent);

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  header: {
    paddingHorizontal: overviewSpacing.gutter,
    gap: overviewSpacing.tight,
  },
  contextRow: {
    minHeight: 34,
    gap: 2,
  },
  rangeSwitcherHidden: {
    opacity: 0,
  },
  contextLabel: {
    fontSize: 13,
    color: overviewColors.textSecondary,
  },
  contextChange: {
    fontSize: 13,
    fontWeight: '600',
  },
  hint: {
    paddingHorizontal: overviewSpacing.gutter,
    paddingBottom: overviewSpacing.row,
    fontSize: 14,
    lineHeight: 20,
    color: overviewColors.textSecondary,
  },
  footer: {
    gap: overviewSpacing.tight,
    paddingHorizontal: overviewSpacing.gutter,
  },
  error: {
    paddingHorizontal: overviewSpacing.gutter,
    paddingBottom: overviewSpacing.row,
    fontSize: 13,
    color: overviewColors.negative,
  },
});
