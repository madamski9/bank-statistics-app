import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SkeletonBar, SkeletonPulse } from '@/features/app-shell/loading/skeleton-pulse';
import type { PlatformSymbol } from '@/features/app-shell/symbols/platform-symbol';
import { reportingCurrency } from '@/features/data/currency-conversion/exchange-rate';
import type { MonthForecast } from '@/features/insights/forecast/month-forecast';
import { calendarCopy } from '@/features/app-shell/localization/calendar-copy';
import { useCopy } from '@/features/app-shell/localization/language';
import { AmountText } from '@/features/settings/privacy/amounts/amount-text';
import { useAmountFormatting } from '@/features/settings/privacy/amounts/use-private-amounts';
import { overviewColors, overviewSpacing } from '@/features/app-shell/theme/overview-theme';
import { impactLight } from '@/haptics';

import { overviewCopy } from '../overview-copy';

export interface OverviewShortcutsProps {
  forecast: MonthForecast;
  recurringMonthlyMinor: number;
  recurringCount: number;
  reportMonth: number;
  isReportLocked: boolean;
  isPremiumLoading: boolean;
  onOpenForecast: () => void;
  onOpenReport: () => void;
  onOpenRecurring: () => void;
}

interface ShortcutTileProps {
  symbol: PlatformSymbol;
  title: string;
  value: string;
  tint?: string;
  locked?: boolean;
  accessibilityLabel: string;
  onPress: () => void;
}

function ShortcutTile({ symbol, title, value, tint, locked, accessibilityLabel, onPress }: ShortcutTileProps) {
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
        {locked ? (
          <SymbolView
            name={{ ios: 'lock.fill', android: 'lock', web: 'lock' }}
            size={12}
            tintColor={overviewColors.caution}
          />
        ) : null}
      </View>
      <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={styles.tileTitle}>
        {title}
      </Text>
      <AmountText
        adjustsFontSizeToFit
        maxFontSizeMultiplier={1.3}
        numberOfLines={1}
        style={[styles.tileValue, tint === undefined ? null : { color: tint }]}
      >
        {value}
      </AmountText>
    </Pressable>
  );
}

function ShortcutTileSkeleton() {
  return (
    <SkeletonPulse style={styles.tile}>
      <View style={styles.tileHeading}>
        <SkeletonBar height={15} radius={5} width={15} />
      </View>
      <SkeletonBar height={10} width="55%" />
      <View style={styles.skeletonValue}>
        <SkeletonBar height={14} width="75%" />
      </View>
    </SkeletonPulse>
  );
}

export function OverviewShortcuts({
  forecast,
  recurringMonthlyMinor,
  recurringCount,
  reportMonth,
  isReportLocked,
  isPremiumLoading,
  onOpenForecast,
  onOpenReport,
  onOpenRecurring,
}: OverviewShortcutsProps) {
  const copy = useCopy(overviewCopy);
  const calendar = useCopy(calendarCopy);
  const { formatCompactAmount } = useAmountFormatting();
  const forecastValue = copy.forecastValue(formatCompactAmount(forecast.projectedMinor, reportingCurrency));
  const reportValue = calendar.monthNames[reportMonth] ?? '';
  const recurringAmount = formatCompactAmount(recurringMonthlyMinor, reportingCurrency);
  const recurringValue =
    recurringCount === 0
      ? copy.recurringNone
      : copy.recurringValue(recurringAmount);

  if (isPremiumLoading) {
    return (
      <View style={styles.row}>
        <ShortcutTileSkeleton />
        <ShortcutTileSkeleton />
        <ShortcutTileSkeleton />
      </View>
    );
  }

  return (
    <View style={styles.row}>
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
        locked={isReportLocked}
        onPress={onOpenReport}
        symbol={{ ios: 'chart.bar.fill', android: 'bar_chart', web: 'bar_chart' }}
        title={copy.reportShort}
        value={reportValue}
      />
      <ShortcutTile
        accessibilityLabel={copy.shortcutLabel(copy.recurring, recurringValue)}
        onPress={onOpenRecurring}
        symbol={{ ios: 'arrow.triangle.2.circlepath', android: 'autorenew', web: 'autorenew' }}
        title={copy.recurring}
        value={recurringCount === 0 ? recurringValue : recurringAmount}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: overviewSpacing.tight,
  },
  tile: {
    flex: 1,
    minWidth: 0,
    minHeight: 88,
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 10,
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
    justifyContent: 'space-between',
    height: 18,
  },
  skeletonValue: {
    marginTop: 6,
  },
  tileTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: overviewColors.textSecondary,
  },
  tileValue: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: overviewColors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
});
