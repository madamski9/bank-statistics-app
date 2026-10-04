import { StyleSheet, Text, View } from 'react-native';

import { reportingCurrency } from '@/features/currency-conversion/exchange-rate';
import { calendarCopy } from '@/features/localization/calendar-copy';
import { useCopy, useLanguage } from '@/features/localization/language';
import { useAmountFormatting } from '@/features/privacy/use-private-amounts';
import { SheetLayout, SheetRow, SheetSection } from '@/features/app-shell/sheet-layout';
import { formatChange } from '@/features/spending-overview/formatting';
import { bubbleTints, overviewColors } from '@/features/spending-overview/overview-theme';
import { formatDayHeading } from '@/features/transactions/format-date';

import { forecastCopy } from './forecast-copy';
import type { MonthForecast } from './month-forecast';

interface ForecastScreenProps {
  forecast: MonthForecast;
  awaitingConversion: number;
  onClose: () => void;
}

export function ForecastScreen({ forecast, awaitingConversion, onClose }: ForecastScreenProps) {
  const copy = useCopy(forecastCopy);
  const calendar = useCopy(calendarCopy);
  const language = useLanguage();
  const { formatAmount, formatCompactAmount } = useAmountFormatting();
  const now = new Date();
  const monthIndex = new Date(forecast.monthStartMs).getMonth();
  const monthName = calendar.monthNames[monthIndex] ?? '';
  const titleMonth = language === 'pl' ? monthName.toLocaleLowerCase('pl') : monthName;
  const previousMonthGenitive = calendar.monthsInGenitive[(monthIndex + 11) % 12] ?? '';
  const change =
    forecast.previousMonthMinor === 0
      ? null
      : (forecast.projectedMinor - forecast.previousMonthMinor) / forecast.previousMonthMinor;
  const spentShare =
    forecast.projectedMinor === 0 ? 0 : Math.min(forecast.spentMinor / forecast.projectedMinor, 1);
  const limit = forecast.limit;
  const target = limit === null ? '' : formatCompactAmount(limit.targetMinor, reportingCurrency);
  const limitLine =
    limit === null
      ? null
      : limit.isExceeded
        ? copy.limitExceeded(target)
        : limit.crossingMs !== null
          ? copy.limitCrossing(target, formatDayHeading(new Date(limit.crossingMs), now))
          : limit.isProjectedOver
            ? copy.limitOver(target)
            : copy.limitSafe(target);
  const notes = [
    forecast.isEarly ? copy.early : null,
    awaitingConversion > 0 ? copy.pendingConversion(awaitingConversion) : null,
    copy.explanation(forecast.historicalMonthsUsed),
  ].filter((note): note is string => note !== null);

  return (
    <SheetLayout closeLabel={copy.done} onClose={onClose} title={copy.title(titleMonth)}>
      <View style={styles.hero}>
        <Text maxFontSizeMultiplier={1.4} style={styles.caption}>
          {copy.projected}
        </Text>
        <Text adjustsFontSizeToFit maxFontSizeMultiplier={1.3} numberOfLines={1} style={styles.amount}>
          ~{formatAmount(forecast.projectedMinor, reportingCurrency)}
        </Text>
        <View style={styles.track}>
          <View style={[styles.trackFill, { width: `${Math.max(spentShare * 100, 2)}%` }]} />
        </View>
        {change !== null ? (
          <Text
            maxFontSizeMultiplier={1.4}
            style={[styles.change, { color: change > 0 ? overviewColors.negative : overviewColors.positive }]}
          >
            {copy.versus(formatChange(change), change > 0, previousMonthGenitive)}
          </Text>
        ) : null}
      </View>

      <SheetSection>
        <SheetRow isFirst label={copy.spent} value={formatAmount(forecast.spentMinor, reportingCurrency)} />
        <SheetRow label={copy.left} value={copy.daysLeft(Math.floor(forecast.remainingDays))} />
        <SheetRow
          label={copy.expectedMore}
          value={formatAmount(forecast.projectedVariableMinor, reportingCurrency)}
        />
        {forecast.upcomingRecurringCount > 0 ? (
          <SheetRow
            label={copy.upcoming}
            value={copy.upcomingValue(
              formatCompactAmount(forecast.upcomingRecurringMinor, reportingCurrency),
              forecast.upcomingRecurringCount,
            )}
          />
        ) : null}
      </SheetSection>

      {limit !== null && limitLine !== null ? (
        <SheetSection label={copy.limit}>
          <SheetRow isFirst label={limitLine} />
        </SheetSection>
      ) : null}

      {notes.map((note) => (
        <Text key={note} maxFontSizeMultiplier={1.5} style={styles.note}>
          {note}
        </Text>
      ))}
    </SheetLayout>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: 8,
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
    color: overviewColors.textSecondary,
  },
  amount: {
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: -1.2,
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
  change: {
    fontSize: 13,
    fontWeight: '600',
  },
  note: {
    fontSize: 12,
    lineHeight: 17,
    color: overviewColors.textSecondary,
  },
});
