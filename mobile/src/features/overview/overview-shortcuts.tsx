import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { reportingCurrency } from '@/features/currency-conversion/exchange-rate';
import type { EventSummary } from '@/features/events/event-summary';
import type { MonthForecast } from '@/features/forecast/month-forecast';
import { calendarCopy } from '@/features/localization/calendar-copy';
import { useCopy } from '@/features/localization/language';
import { useAmountFormatting } from '@/features/privacy/use-private-amounts';
import { overviewColors, overviewSpacing } from '@/features/spending-overview/overview-theme';
import { impactLight } from '@/haptics';

import { overviewCopy } from './overview-copy';

export interface OverviewShortcutsProps {
  forecast: MonthForecast;
  activeEvent: EventSummary | null;
  recurringMonthlyMinor: number;
  recurringCount: number;
  reportMonth: number;
  isReportLocked: boolean;
  onOpenForecast: () => void;
  onOpenReport: () => void;
  onOpenRecurring: () => void;
  onOpenEvents: () => void;
}

interface ShortcutTileProps {
  symbol: SymbolViewProps['name'];
  title: string;
  value: string;
  tint?: string;
  badge?: string;
  accessibilityLabel: string;
  onPress: () => void;
}

function ShortcutTile({ symbol, title, value, tint, badge, accessibilityLabel, onPress }: ShortcutTileProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={() => {
        impactLight();
        onPress();
      }}
      style={({ pressed }) => [styles.tile, pressed ? styles.tilePressed : null]}
    >
      <View style={styles.tileHeading}>
        <SymbolView name={symbol} size={15} tintColor={tint ?? overviewColors.textSecondary} />
        <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={styles.tileTitle}>
          {title}
        </Text>
      </View>
      <View style={styles.tileValueRow}>
        <Text
          adjustsFontSizeToFit
          maxFontSizeMultiplier={1.3}
          numberOfLines={1}
          style={[styles.tileValue, tint === undefined ? null : { color: tint }]}
        >
          {value}
        </Text>
        {badge !== undefined ? (
          <View style={styles.badge}>
            <SymbolView
              name={{ ios: 'lock.fill', android: 'lock', web: 'lock' }}
              size={10}
              tintColor={overviewColors.caution}
            />
            <Text maxFontSizeMultiplier={1.2} style={styles.badgeLabel}>
              {badge}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

export function OverviewShortcuts({
  forecast,
  activeEvent,
  recurringMonthlyMinor,
  recurringCount,
  reportMonth,
  isReportLocked,
  onOpenForecast,
  onOpenReport,
  onOpenRecurring,
  onOpenEvents,
}: OverviewShortcutsProps) {
  const copy = useCopy(overviewCopy);
  const calendar = useCopy(calendarCopy);
  const { formatCompactAmount } = useAmountFormatting();
  const forecastValue = copy.forecastValue(formatCompactAmount(forecast.projectedMinor, reportingCurrency));
  const reportValue = calendar.monthNames[reportMonth] ?? '';
  const recurringValue =
    recurringCount === 0
      ? copy.recurringNone
      : copy.recurringValue(formatCompactAmount(recurringMonthlyMinor, reportingCurrency));
  const eventTitle = activeEvent === null ? copy.event : activeEvent.event.name;
  const eventValue =
    activeEvent === null ? copy.eventStart : formatCompactAmount(activeEvent.expenseMinor, reportingCurrency);

  return (
    <ScrollView
      accessibilityLabel={copy.shortcuts}
      contentContainerStyle={styles.row}
      horizontal
      showsHorizontalScrollIndicator={false}
    >
      <ShortcutTile
        accessibilityLabel={copy.shortcutLabel(copy.forecast, forecastValue)}
        onPress={onOpenForecast}
        symbol={{ ios: 'chart.line.uptrend.xyaxis', android: 'trending_up', web: 'trending_up' }}
        tint={forecast.limit?.isProjectedOver === true ? overviewColors.caution : undefined}
        title={copy.forecast}
        value={forecastValue}
      />
      <ShortcutTile
        accessibilityLabel={
          isReportLocked ? copy.lockedLabel(copy.report) : copy.shortcutLabel(copy.report, reportValue)
        }
        badge={isReportLocked ? copy.premium : undefined}
        onPress={onOpenReport}
        symbol={{ ios: 'chart.bar.fill', android: 'bar_chart', web: 'bar_chart' }}
        title={copy.report}
        value={reportValue}
      />
      <ShortcutTile
        accessibilityLabel={copy.shortcutLabel(copy.recurring, recurringValue)}
        onPress={onOpenRecurring}
        symbol={{ ios: 'arrow.triangle.2.circlepath', android: 'autorenew', web: 'autorenew' }}
        title={copy.recurring}
        value={recurringValue}
      />
      <ShortcutTile
        accessibilityLabel={copy.shortcutLabel(eventTitle, eventValue)}
        onPress={onOpenEvents}
        symbol={{ ios: 'flag.fill', android: 'flag', web: 'flag' }}
        tint={activeEvent === null ? undefined : overviewColors.positive}
        title={eventTitle}
        value={eventValue}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: overviewSpacing.tight,
    paddingHorizontal: overviewSpacing.gutter,
  },
  tile: {
    width: 148,
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: overviewColors.hairline,
    backgroundColor: overviewColors.surface,
  },
  tilePressed: {
    backgroundColor: overviewColors.surfacePressed,
  },
  tileHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tileTitle: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: overviewColors.textSecondary,
  },
  tileValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tileValue: {
    flexShrink: 1,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: overviewColors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 196, 107, 0.14)',
  },
  badgeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: overviewColors.caution,
  },
});
