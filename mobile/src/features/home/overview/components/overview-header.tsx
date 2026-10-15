import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ReduceMotion } from 'react-native-reanimated';

import { formatChange } from '@/features/app-shell/formatting/formatting';
import { useCopy } from '@/features/app-shell/localization/language';
import { overviewColors, overviewSpacing } from '@/features/app-shell/theme/overview-theme';
import type { EventSummary } from '@/features/insights/events/event-summary';
import { eventsCopy } from '@/features/insights/events/events-copy';
import { AmountText } from '@/features/settings/privacy/amounts/amount-text';

import { overviewCopy } from '../overview-copy';
import { periodOption, type SpendingPeriod } from '../period/periods';
import { RangeSwitcher } from '../period/range-switcher';

const contextEntering = FadeIn.duration(240).delay(80).reduceMotion(ReduceMotion.System);
const contextExiting = FadeOut.duration(160).reduceMotion(ReduceMotion.System);

interface OverviewHeaderProps {
  focusedEvent: EventSummary | null;
  expenseChange: number | null;
  period: SpendingPeriod;
  lockedPeriods: ReadonlySet<SpendingPeriod>;
  onChangePeriod: (period: SpendingPeriod) => void;
}

export function OverviewHeader({
  focusedEvent,
  expenseChange,
  period,
  lockedPeriods,
  onChangePeriod,
}: OverviewHeaderProps) {
  const copy = useCopy(overviewCopy);
  const eventCopy = useCopy(eventsCopy);
  const option = periodOption(period);

  return (
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
  );
}

const styles = StyleSheet.create({
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
});
