import { memo, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { reportingCurrency } from '@/features/currency-conversion/exchange-rate';
import type { EventSummary } from '@/features/events/event-summary';
import { eventNameError, type SpendingEvent } from '@/features/events/spending-event';
import type { MonthForecast } from '@/features/forecast/month-forecast';
import { calendarCopy } from '@/features/localization/calendar-copy';
import { useCopy, useLanguage } from '@/features/localization/language';
import type { MonthlySummary } from '@/features/monthly-summary/monthly-summary';
import { useAmountFormatting } from '@/features/privacy/use-private-amounts';
import { formatChange } from '@/features/spending-overview/formatting';
import { bubbleTints, overviewColors, overviewSpacing } from '@/features/spending-overview/overview-theme';
import {
  hasPriceIncrease,
  monthlyRecurringCost,
  type RecurringPayment,
} from '@/features/subscriptions/recurring-payments';
import { formatDayHeading } from '@/features/transactions/format-date';
import { impactLight } from '@/haptics';

import { insightsCopy } from './insights-copy';
import { NamePrompt } from './name-prompt';

interface InsightsScreenProps {
  forecast: MonthForecast;
  activeEvent: EventSummary | null;
  eventCount: number;
  recurring: RecurringPayment[];
  lastMonth: MonthlySummary | null;
  awaitingConversion: number;
  onStartEvent: (name: string) => Promise<SpendingEvent>;
  onEndEvent: (event: SpendingEvent) => Promise<void>;
  onOpenEvents: (eventId: string | null) => void;
  onOpenRecurring: () => void;
  onOpenMonthlySummary: () => void;
}

const previewedPayments = 3;

function InsightCard({
  title,
  children,
  onPress,
  accessibilityLabel,
}: {
  title: string;
  children: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  const body = (
    <>
      <Text maxFontSizeMultiplier={1.4} style={styles.cardTitle}>
        {title}
      </Text>
      {children}
    </>
  );

  if (onPress === undefined) {
    return <View style={styles.card}>{body}</View>;
  }

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed ? styles.cardPressed : null]}
    >
      {body}
    </Pressable>
  );
}

function InsightsScreenComponent({
  forecast,
  activeEvent,
  eventCount,
  recurring,
  lastMonth,
  awaitingConversion,
  onStartEvent,
  onEndEvent,
  onOpenEvents,
  onOpenRecurring,
  onOpenMonthlySummary,
}: InsightsScreenProps) {
  const copy = useCopy(insightsCopy);
  const calendar = useCopy(calendarCopy);
  const { formatAmount, formatCompactAmount } = useAmountFormatting();
  const insets = useSafeAreaInsets();
  const [isStarting, setIsStarting] = useState(false);
  const now = new Date();
  const language = useLanguage();
  const currentMonthName = calendar.monthNames[now.getMonth()] ?? '';
  const monthName = language === 'pl' ? currentMonthName.toLocaleLowerCase('pl') : currentMonthName;
  const previousMonthGenitive = calendar.monthsInGenitive[(now.getMonth() + 11) % 12] ?? '';
  const change =
    forecast.previousMonthMinor === 0
      ? null
      : (forecast.projectedMinor - forecast.previousMonthMinor) / forecast.previousMonthMinor;
  const spentShare =
    forecast.projectedMinor === 0 ? 0 : Math.min(forecast.spentMinor / forecast.projectedMinor, 1);
  const activePayments = recurring.filter((payment) => payment.isActive);
  const limit = forecast.limit;
  const limitLine =
    limit === null
      ? null
      : limit.isExceeded
        ? copy.limitExceeded(formatCompactAmount(limit.targetMinor, reportingCurrency))
        : limit.crossingMs !== null
          ? copy.limitCrossing(
              formatCompactAmount(limit.targetMinor, reportingCurrency),
              formatDayHeading(new Date(limit.crossingMs), now),
            )
          : limit.isProjectedOver
            ? copy.limitOver(formatCompactAmount(limit.targetMinor, reportingCurrency))
            : copy.limitSafe(formatCompactAmount(limit.targetMinor, reportingCurrency));

  return (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
      indicatorStyle="white"
      showsVerticalScrollIndicator={false}
    >
      <InsightCard
        accessibilityLabel={copy.forecastLabel(
          formatAmount(forecast.projectedMinor, reportingCurrency),
          formatAmount(forecast.spentMinor, reportingCurrency),
        )}
        title={copy.forecastTitle(monthName)}
      >
        <Text adjustsFontSizeToFit maxFontSizeMultiplier={1.3} numberOfLines={1} style={styles.bigAmount}>
          ~{formatCompactAmount(forecast.projectedMinor, reportingCurrency)}
        </Text>
        <View style={styles.track}>
          <View style={[styles.trackFill, { width: `${Math.max(spentShare * 100, 2)}%` }]} />
        </View>
        <Text maxFontSizeMultiplier={1.4} style={styles.secondary}>
          {copy.forecastSpent(
            formatCompactAmount(forecast.spentMinor, reportingCurrency),
            Math.floor(forecast.remainingDays),
          )}
        </Text>
        <Text maxFontSizeMultiplier={1.4} style={styles.secondary}>
          {copy.forecastPace(formatCompactAmount(forecast.dailyPaceMinor, reportingCurrency))}
        </Text>
        {change !== null ? (
          <Text
            maxFontSizeMultiplier={1.4}
            style={[styles.change, { color: change > 0 ? overviewColors.negative : overviewColors.positive }]}
          >
            {copy.forecastVersus(formatChange(change), change > 0, previousMonthGenitive)}
          </Text>
        ) : null}
        {forecast.upcomingRecurringCount > 0 ? (
          <Text maxFontSizeMultiplier={1.4} style={styles.secondary}>
            {copy.forecastRecurring(
              formatCompactAmount(forecast.upcomingRecurringMinor, reportingCurrency),
              forecast.upcomingRecurringCount,
            )}
          </Text>
        ) : null}
        {limitLine !== null ? (
          <Text
            maxFontSizeMultiplier={1.4}
            style={[styles.secondary, limit?.isProjectedOver === true ? styles.caution : null]}
          >
            {limitLine}
          </Text>
        ) : null}
        {forecast.isEarly ? (
          <Text maxFontSizeMultiplier={1.4} style={styles.muted}>
            {copy.forecastEarly}
          </Text>
        ) : null}
        {awaitingConversion > 0 ? (
          <Text maxFontSizeMultiplier={1.4} style={styles.muted}>
            {copy.pendingConversion(awaitingConversion)}
          </Text>
        ) : null}
      </InsightCard>

      <InsightCard title={copy.eventTitle}>
        {activeEvent === null ? (
          <>
            <Text maxFontSizeMultiplier={1.5} style={styles.secondary}>
              {copy.eventIdle}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                impactLight();
                setIsStarting(true);
              }}
              style={({ pressed }) => [styles.primaryButton, pressed ? styles.pressed : null]}
            >
              <Text maxFontSizeMultiplier={1.4} style={styles.primaryLabel}>
                {copy.startEvent}
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text maxFontSizeMultiplier={1.4} numberOfLines={2} style={styles.eventName}>
              {activeEvent.event.name}
            </Text>
            <Text maxFontSizeMultiplier={1.4} style={styles.secondary}>
              {copy.eventActive(formatDayHeading(new Date(activeEvent.event.startedAt), now))}
            </Text>
            <Text maxFontSizeMultiplier={1.3} style={styles.mediumAmount}>
              {copy.eventSpent(
                formatAmount(activeEvent.expenseMinor, reportingCurrency),
                formatCompactAmount(activeEvent.dailyExpenseMinor, reportingCurrency),
              )}
            </Text>
            <View style={styles.buttonRow}>
              <Pressable
                accessibilityRole="button"
                onPress={() => onOpenEvents(activeEvent.event.id)}
                style={({ pressed }) => [styles.secondaryButton, pressed ? styles.pressed : null]}
              >
                <Text maxFontSizeMultiplier={1.4} style={styles.secondaryLabel}>
                  {copy.eventDetails}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  impactLight();
                  void onEndEvent(activeEvent.event);
                }}
                style={({ pressed }) => [styles.primaryButton, styles.flexButton, pressed ? styles.pressed : null]}
              >
                <Text maxFontSizeMultiplier={1.4} style={styles.primaryLabel}>
                  {copy.endEvent}
                </Text>
              </Pressable>
            </View>
          </>
        )}
        {eventCount > 0 ? (
          <Pressable accessibilityRole="button" hitSlop={8} onPress={() => onOpenEvents(null)}>
            <Text maxFontSizeMultiplier={1.4} style={styles.link}>
              {copy.allEvents(eventCount)}
            </Text>
          </Pressable>
        ) : null}
      </InsightCard>

      <InsightCard onPress={onOpenRecurring} title={copy.recurringTitle}>
        {activePayments.length === 0 ? (
          <Text maxFontSizeMultiplier={1.5} style={styles.secondary}>
            {copy.recurringEmpty}
          </Text>
        ) : (
          <>
            <Text maxFontSizeMultiplier={1.4} style={styles.mediumAmount}>
              {copy.recurringTotal(
                formatAmount(monthlyRecurringCost(recurring), reportingCurrency),
                activePayments.length,
              )}
            </Text>
            {activePayments.slice(0, previewedPayments).map((payment) => (
              <View key={payment.key} style={styles.paymentRow}>
                <Text maxFontSizeMultiplier={1.4} numberOfLines={1} style={styles.paymentName}>
                  {payment.name}
                </Text>
                <Text maxFontSizeMultiplier={1.4} style={[styles.paymentMeta, hasPriceIncrease(payment) ? styles.caution : null]}>
                  {hasPriceIncrease(payment)
                    ? copy.recurringIncrease
                    : copy.recurringNext(formatDayHeading(new Date(payment.nextExpectedAt), now))}
                </Text>
                <Text maxFontSizeMultiplier={1.4} style={styles.paymentAmount}>
                  {formatAmount(payment.lastAmountMinor, reportingCurrency)}
                </Text>
              </View>
            ))}
            <Text maxFontSizeMultiplier={1.4} style={styles.link}>
              {copy.showAll}
            </Text>
          </>
        )}
      </InsightCard>

      <InsightCard
        onPress={onOpenMonthlySummary}
        title={
          lastMonth === null
            ? copy.summaryTitle(calendar.monthNames[(now.getMonth() + 11) % 12] ?? '')
            : copy.summaryTitle(calendar.monthNames[lastMonth.month.month] ?? '')
        }
      >
        {lastMonth === null || lastMonth.expenseCount + lastMonth.incomeCount === 0 ? (
          <Text maxFontSizeMultiplier={1.5} style={styles.secondary}>
            {copy.summaryEmpty}
          </Text>
        ) : (
          <>
            <Text maxFontSizeMultiplier={1.4} style={styles.mediumAmount}>
              {copy.summarySpent(formatAmount(lastMonth.expenseMinor, reportingCurrency))}
            </Text>
            {lastMonth.categories[0] !== undefined ? (
              <Text maxFontSizeMultiplier={1.4} style={styles.secondary}>
                {lastMonth.categories
                  .slice(0, 3)
                  .map((group) => group.name)
                  .join(' · ')}
              </Text>
            ) : null}
          </>
        )}
        <Text maxFontSizeMultiplier={1.4} style={styles.link}>
          {copy.summaryOpen}
        </Text>
      </InsightCard>

      <NamePrompt
        cancelLabel={copy.cancel}
        confirmLabel={copy.startEvent}
        message={copy.startMessage}
        onCancel={() => setIsStarting(false)}
        onConfirm={async (name) => {
          await onStartEvent(name);
          setIsStarting(false);
        }}
        placeholder={copy.namePlaceholder}
        title={copy.startTitle}
        validate={eventNameError}
        visible={isStarting}
      />
    </ScrollView>
  );
}

export const InsightsScreen = memo(InsightsScreenComponent);

const styles = StyleSheet.create({
  content: {
    gap: overviewSpacing.block,
    paddingHorizontal: overviewSpacing.gutter,
    paddingTop: overviewSpacing.tight,
  },
  card: {
    gap: 8,
    padding: overviewSpacing.block,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: overviewColors.hairline,
    backgroundColor: overviewColors.surface,
  },
  cardPressed: {
    backgroundColor: overviewColors.surfacePressed,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: overviewColors.textSecondary,
  },
  bigAmount: {
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -1,
    color: overviewColors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  mediumAmount: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.3,
    color: overviewColors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  track: {
    height: 6,
    overflow: 'hidden',
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
  },
  trackFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: bubbleTints.expense.film,
  },
  secondary: {
    fontSize: 14,
    lineHeight: 20,
    color: overviewColors.textSecondary,
  },
  muted: {
    fontSize: 12,
    lineHeight: 17,
    color: overviewColors.textDisabled,
  },
  change: {
    fontSize: 13,
    fontWeight: '600',
  },
  caution: {
    color: overviewColors.caution,
  },
  eventName: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: overviewColors.textPrimary,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: overviewSpacing.tight,
    marginTop: 4,
  },
  flexButton: {
    flex: 1,
  },
  primaryButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: overviewSpacing.block,
    marginTop: 4,
    borderRadius: 14,
    backgroundColor: overviewColors.textPrimary,
  },
  primaryLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: overviewColors.background,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    borderRadius: 14,
    backgroundColor: overviewColors.surfacePressed,
  },
  secondaryLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: overviewColors.textPrimary,
  },
  link: {
    fontSize: 14,
    fontWeight: '600',
    color: overviewColors.textPrimary,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  paymentName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: overviewColors.textPrimary,
  },
  paymentMeta: {
    fontSize: 12,
    color: overviewColors.textSecondary,
  },
  paymentAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: overviewColors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  pressed: {
    opacity: 0.6,
  },
});
