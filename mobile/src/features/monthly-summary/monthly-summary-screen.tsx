import type { IngestionRecord } from '@bankstats/ingestion-native';
import { SymbolView } from 'expo-symbols';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInLeft, FadeInRight, ReduceMotion } from 'react-native-reanimated';

import type { CategorizationRule } from '@/features/classification/categorization-rule';
import type { SpendingGroup } from '@/features/classification/spending-groups';
import { reportingCurrency } from '@/features/currency-conversion/exchange-rate';
import type { SpendingEvent } from '@/features/events/spending-event';
import { calendarCopy } from '@/features/localization/calendar-copy';
import { useCopy, useLanguage } from '@/features/localization/language';
import { useAmountFormatting } from '@/features/privacy/use-private-amounts';
import { ScalePressable } from '@/features/app-shell/scale-pressable';
import { SheetLayout, SheetRow, SheetSection, SheetSwitchRow } from '@/features/app-shell/sheet-layout';
import {
  formatChange,
  formatShare,
  formatTransactionCount,
} from '@/features/spending-overview/formatting';
import { bubbleTints, overviewColors, overviewSpacing } from '@/features/spending-overview/overview-theme';
import type { RecurringPayment } from '@/features/subscriptions/recurring-payments';
import { transactionTitle } from '@/features/transactions/transaction-record';
import { selectionChanged } from '@/haptics';

import { DailySpendBars } from './daily-spend-bars';
import { GrowingFill } from './growing-fill';
import { MonthlyGroupScreen, type SummaryGroupSelection } from './monthly-group-screen';
import { MonthComparisonChart } from './month-comparison';
import {
  compareMonths,
  monthKey,
  parseMonthKey,
  summarizeMonth,
  summaryMonths,
  type SummaryMonth,
} from './monthly-summary';
import { monthlySummaryCopy } from './monthly-summary-copy';
import { reportSeriesColors } from './report-colors';
import type { MonthlySummaryReminder } from './use-monthly-summary-reminder';

interface MonthlySummaryScreenProps {
  records: IngestionRecord[];
  rules: CategorizationRule[];
  events: SpendingEvent[];
  recurring: RecurringPayment[];
  initialMonth?: string | null;
  reminder: MonthlySummaryReminder;
  onClose: () => void;
}

interface ShareRowProps {
  group: SpendingGroup;
  index: number;
  fraction: number;
  value: string;
  detail: string;
  tint: string;
  accessibilityHint: string;
  onPress: () => void;
}

function ShareRow({ group, index, fraction, value, detail, tint, accessibilityHint, onPress }: ShareRowProps) {
  return (
    <ScalePressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={`${group.name}, ${value}, ${detail}`}
      accessibilityRole="button"
      onPress={onPress}
      pressedScale={0.98}
      style={styles.shareRow}
    >
      <View style={[styles.shareIcon, { backgroundColor: tint }]}>
        <Text maxFontSizeMultiplier={1.2} style={styles.shareIconText}>
          {group.name.charAt(0).toLocaleUpperCase()}
        </Text>
      </View>
      <View style={styles.shareBody}>
        <View style={styles.shareHeading}>
          <Text maxFontSizeMultiplier={1.4} numberOfLines={1} style={styles.shareName}>
            {group.name}
          </Text>
          <Text maxFontSizeMultiplier={1.4} style={styles.shareValue}>
            {value}
          </Text>
        </View>
        <View style={styles.shareTrack}>
          <GrowingFill
            color={tint}
            delayMs={120 + index * 50}
            fraction={Math.max(fraction, 0.02)}
            style={styles.shareFill}
          />
        </View>
        <Text maxFontSizeMultiplier={1.4} style={styles.shareDetail}>
          {detail}
        </Text>
      </View>
      <SymbolView
        accessibilityElementsHidden
        importantForAccessibility="no"
        name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
        size={14}
        tintColor={overviewColors.textSecondary}
      />
    </ScalePressable>
  );
}

interface HighlightProps {
  label: string;
  value: string;
  detail?: string;
}

function Highlight({ label, value, detail }: HighlightProps) {
  return (
    <View
      accessibilityLabel={`${label}: ${value}${detail === undefined ? '' : `, ${detail}`}`}
      accessible
      style={styles.highlight}
    >
      <Text maxFontSizeMultiplier={1.4} numberOfLines={1} style={styles.highlightLabel}>
        {label}
      </Text>
      <Text adjustsFontSizeToFit maxFontSizeMultiplier={1.3} numberOfLines={1} style={styles.highlightValue}>
        {value}
      </Text>
      {detail !== undefined ? (
        <Text maxFontSizeMultiplier={1.4} numberOfLines={1} style={styles.highlightDetail}>
          {detail}
        </Text>
      ) : null}
    </View>
  );
}

export function MonthlySummaryScreen({
  records,
  rules,
  events,
  recurring,
  initialMonth = null,
  reminder,
  onClose,
}: MonthlySummaryScreenProps) {
  const copy = useCopy(monthlySummaryCopy);
  const calendar = useCopy(calendarCopy);
  const language = useLanguage();
  const { formatAmount, formatCompactAmount, formatSignedAmount } = useAmountFormatting();
  const now = useMemo(() => new Date(), []);
  const requestedMonth = useMemo(() => initialMonth === null ? null : parseMonthKey(initialMonth), [initialMonth]);
  const months = useMemo(() => summaryMonths(records, now, requestedMonth), [now, records, requestedMonth]);
  const [breakdownDimension, setBreakdownDimension] = useState<'merchant' | 'category'>('merchant');
  const [showAllGroups, setShowAllGroups] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<SummaryGroupSelection | null>(null);
  const [travel, setTravel] = useState<'older' | 'newer' | null>(null);
  const { confirmPermission } = reminder;

  useEffect(() => {
    void confirmPermission();
  }, [confirmPermission]);
  const [selectedKey, setSelectedKey] = useState(() => {
    const fallback = months[1] ?? months[0];

    return monthKey(requestedMonth ?? fallback ?? { year: now.getFullYear(), month: now.getMonth() });
  });
  const index = Math.max(
    months.findIndex((month) => monthKey(month) === selectedKey),
    0,
  );
  const month: SummaryMonth = useMemo(
    () => months[index] ?? { year: now.getFullYear(), month: now.getMonth() },
    [index, months, now],
  );
  const summary = useMemo(
    () => summarizeMonth(records, month, { rules, events, recurring, now }),
    [events, month, now, records, recurring, rules],
  );
  const comparedMonths = useMemo(() => compareMonths(records, month, now), [month, now, records]);
  const title = `${calendar.monthNames[month.month] ?? ''} ${month.year}`;
  const isEmpty = summary.expenseCount + summary.incomeCount === 0;
  const dayLabel = (day: number) => calendar.dayMonth(day, calendar.monthsInGenitive[month.month] ?? '');
  const busiestLabel = summary.busiestDay === null ? null : dayLabel(summary.busiestDay.day);
  const activeDimension = summary.merchants.length === 0 ? 'category' : breakdownDimension;
  const groups = activeDimension === 'merchant' ? summary.merchants : summary.categories;
  const visibleGroups = showAllGroups ? groups : groups.slice(0, 5);
  const leadingMinor = groups[0]?.totalMinor ?? 0;
  const perDayCount = summary.transactionsPerDay.toFixed(1).replace('.', language === 'pl' ? ',' : '.');
  const change = summary.dailyExpenseChange;
  const chartCategories = summary.dailyCategories.slice(0, 3).map((group) => group.name);

  if (summary.dailyCategories.length > 3) {
    chartCategories.push(copy.other);
  }

  const move = (delta: number) => {
    const next = months[index + delta];

    if (next !== undefined) {
      selectionChanged();
      setTravel(delta > 0 ? 'older' : 'newer');
      setSelectedKey(monthKey(next));
      setShowAllGroups(false);
    }
  };

  if (selectedGroup !== null) {
    return (
      <MonthlyGroupScreen
        group={selectedGroup}
        month={month}
        monthExpenseMinor={summary.expenseMinor}
        now={now}
        onBack={() => setSelectedGroup(null)}
        onClose={onClose}
        records={records}
        rules={rules}
      />
    );
  }

  return (
    <SheetLayout closeLabel={copy.done} onClose={onClose} title={copy.title}>
      <View style={styles.monthRow}>
        <ScalePressable
          accessibilityLabel={copy.previousMonth}
          accessibilityRole="button"
          containerStyle={index >= months.length - 1 ? styles.hidden : null}
          disabled={index >= months.length - 1}
          hitSlop={8}
          onPress={() => move(1)}
          pressedScale={0.88}
          style={styles.monthArrow}
        >
          <SymbolView
            name={{ ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }}
            size={17}
            tintColor={overviewColors.textPrimary}
          />
        </ScalePressable>
        <Animated.View entering={travel === null ? undefined : monthEntering(travel)} key={selectedKey} style={styles.monthTitle}>
          <Text accessibilityRole="header" maxFontSizeMultiplier={1.3} style={styles.monthName}>
            {title}
          </Text>
          {!summary.isComplete ? (
            <Text maxFontSizeMultiplier={1.4} style={styles.caption}>
              {copy.inProgress}
            </Text>
          ) : null}
        </Animated.View>
        <ScalePressable
          accessibilityLabel={copy.nextMonth}
          accessibilityRole="button"
          containerStyle={index === 0 ? styles.hidden : null}
          disabled={index === 0}
          hitSlop={8}
          onPress={() => move(-1)}
          pressedScale={0.88}
          style={styles.monthArrow}
        >
          <SymbolView
            name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
            size={17}
            tintColor={overviewColors.textPrimary}
          />
        </ScalePressable>
      </View>

      <Animated.View
        entering={travel === null ? FadeIn.duration(240).reduceMotion(ReduceMotion.System) : monthEntering(travel)}
        key={selectedKey}
        style={styles.monthContent}
      >
        <View style={styles.card}>
          <View style={styles.heroRow}>
            <View style={styles.hero}>
              <View style={styles.averageCaption}>
                <View style={styles.averageSwatch} />
                <Text maxFontSizeMultiplier={1.4} style={[styles.caption, styles.averageCaptionText]}>
                  {copy.dailyAverage}
                </Text>
              </View>
              <Text adjustsFontSizeToFit maxFontSizeMultiplier={1.3} numberOfLines={1} style={styles.amount}>
                {formatAmount(summary.dailyExpenseMinor, reportingCurrency)}
              </Text>
            </View>
            {change !== null ? (
              <Text
                maxFontSizeMultiplier={1.4}
                numberOfLines={2}
                style={[styles.change, { color: change > 0 ? overviewColors.negative : overviewColors.positive }]}
              >
                {copy.versusPrevious(formatChange(change), change > 0)}
              </Text>
            ) : (
              <Text maxFontSizeMultiplier={1.4} style={styles.change}>
                {copy.noPrevious}
              </Text>
            )}
          </View>
          <DailySpendBars
            accessibilityLabel={copy.chartLabel(
              formatAmount(summary.dailyExpenseMinor, reportingCurrency),
              busiestLabel,
              chartCategories,
            )}
            averageLabel={copy.average}
            averageMinor={summary.dailyExpenseMinor}
            dailyCategories={summary.dailyCategories}
            dailyExpensesMinor={summary.dailyExpensesMinor}
            elapsedDays={summary.elapsedDays}
            otherLabel={copy.other}
          />
          <Text maxFontSizeMultiplier={1.4} style={styles.cardTotal}>
            {copy.total(
              formatAmount(summary.expenseMinor, reportingCurrency),
              formatTransactionCount(summary.expenseCount),
            )}
          </Text>
        </View>

        {isEmpty ? (
          <Text maxFontSizeMultiplier={1.5} style={styles.caption}>
            {copy.empty}
          </Text>
        ) : null}

        {groups.length > 0 ? (
          <View style={styles.section}>
            <Text maxFontSizeMultiplier={1.4} style={styles.sectionLabel}>
              {copy.spendingBy.toLocaleUpperCase()}
            </Text>
            <View accessibilityRole="tablist" style={styles.dimensionSwitcher}>
              {(['merchant', 'category'] as const).map((dimension) => {
                const selected = activeDimension === dimension;
                const disabled = (dimension === 'merchant' ? summary.merchants : summary.categories).length === 0;

                return (
                  <ScalePressable
                    accessibilityRole="tab"
                    accessibilityState={{ selected, disabled }}
                    containerStyle={styles.dimensionTabContainer}
                    disabled={disabled}
                    key={dimension}
                    onPress={() => {
                      selectionChanged();
                      setBreakdownDimension(dimension);
                      setShowAllGroups(false);
                    }}
                    style={[styles.dimensionTab, selected ? styles.dimensionSelected : null]}
                  >
                    <Text maxFontSizeMultiplier={1.3} style={[styles.dimensionLabel, selected ? styles.dimensionLabelSelected : null]}>
                      {dimension === 'merchant' ? copy.merchants : copy.categories}
                    </Text>
                  </ScalePressable>
                );
              })}
            </View>
            <Animated.View
              entering={FadeIn.duration(220).reduceMotion(ReduceMotion.System)}
              key={activeDimension}
              style={styles.shareList}
            >
              {visibleGroups.map((group, groupIndex) => (
                <ShareRow
                  accessibilityHint={copy.openGroupDetail}
                  detail={copy.groupDetail(
                    copy.payments(group.count),
                    formatShare(summary.expenseMinor === 0 ? 0 : group.totalMinor / summary.expenseMinor),
                  )}
                  fraction={leadingMinor === 0 ? 0 : group.totalMinor / leadingMinor}
                  group={group}
                  index={groupIndex}
                  key={group.key}
                  onPress={() => {
                    selectionChanged();
                    setSelectedGroup({ dimension: activeDimension, key: group.key, name: group.name });
                  }}
                  tint={activeDimension === 'category'
                    ? reportSeriesColors[Math.min(groupIndex, reportSeriesColors.length - 1)]
                    : bubbleTints.expense.film}
                  value={formatAmount(group.totalMinor, reportingCurrency)}
                />
              ))}
              {groups.length > 5 ? (
                <ScalePressable
                  accessibilityRole="button"
                  onPress={() => {
                    selectionChanged();
                    setShowAllGroups((current) => !current);
                  }}
                  pressedScale={0.97}
                  style={styles.showAllButton}
                >
                  <Text maxFontSizeMultiplier={1.4} style={styles.showAllLabel}>
                    {showAllGroups ? copy.showLess : copy.showAll(groups.length)}
                  </Text>
                </ScalePressable>
              ) : null}
            </Animated.View>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text maxFontSizeMultiplier={1.4} style={styles.sectionLabel}>
            {copy.monthComparison.toLocaleUpperCase()}
          </Text>
          <Text maxFontSizeMultiplier={1.4} style={styles.caption}>
            {copy.monthComparisonDetail}
          </Text>
          <MonthComparisonChart months={comparedMonths} />
        </View>

        {!isEmpty ? (
          <>
            <View style={styles.section}>
              <Text maxFontSizeMultiplier={1.4} style={styles.sectionLabel}>
                {copy.highlights.toLocaleUpperCase()}
              </Text>
              <View style={styles.highlights}>
                {summary.busiestDay !== null && busiestLabel !== null ? (
                  <Highlight
                    detail={busiestLabel}
                    label={copy.busiestDay}
                    value={formatCompactAmount(summary.busiestDay.totalMinor, reportingCurrency)}
                  />
                ) : null}
                {summary.largestExpense !== null ? (
                  <Highlight
                    detail={transactionTitle(summary.largestExpense, rules)}
                    label={copy.largest}
                    value={formatCompactAmount(summary.largestExpense.amountMinor, reportingCurrency)}
                  />
                ) : null}
                <Highlight
                  label={copy.noSpendDays}
                  value={copy.noSpendValue(summary.noSpendDays, summary.elapsedDays)}
                />
                <Highlight label={copy.perDayCount} value={perDayCount} />
              </View>
            </View>

            <SheetSection label={copy.flow}>
              <SheetRow
                isFirst
                label={copy.received}
                value={`+${formatAmount(summary.incomeMinor, reportingCurrency)}`}
                valueTone="positive"
              />
              <SheetRow
                label={copy.net}
                value={formatSignedAmount(summary.netMinor, reportingCurrency)}
                valueTone={summary.netMinor < 0 ? 'negative' : 'positive'}
              />
              {summary.recurringMinor > 0 ? (
                <SheetRow
                  label={copy.recurring}
                  value={copy.recurringValue(
                    formatAmount(summary.recurringMinor, reportingCurrency),
                    formatShare(summary.expenseMinor === 0 ? 0 : summary.recurringMinor / summary.expenseMinor),
                  )}
                />
              ) : null}
            </SheetSection>

            {summary.events.length > 0 ? (
              <SheetSection label={copy.events}>
                {summary.events.map((entry, rowIndex) => (
                  <SheetRow
                    isFirst={rowIndex === 0}
                    key={entry.event.id}
                    label={entry.event.name}
                    value={formatAmount(entry.expenseMinor, reportingCurrency)}
                  />
                ))}
              </SheetSection>
            ) : null}
          </>
        ) : null}
      </Animated.View>

      <SheetSection footnote={reminder.isDenied ? copy.reminderDenied : copy.reminderDetail}>
        <SheetSwitchRow
          isFirst
          label={copy.reminder}
          onChange={(value) => void reminder.setEnabled(value)}
          value={reminder.isEnabled}
        />
      </SheetSection>
    </SheetLayout>
  );
}

function monthEntering(travel: 'older' | 'newer') {
  const transition = travel === 'older' ? FadeInLeft : FadeInRight;

  return transition.springify().duration(420).dampingRatio(0.9).reduceMotion(ReduceMotion.System);
}

const styles = StyleSheet.create({
  monthContent: {
    gap: overviewSpacing.section,
  },
  averageCaption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  averageSwatch: {
    width: 14,
    borderTopWidth: 2,
    borderStyle: 'dashed',
    borderColor: overviewColors.positive,
  },
  averageCaptionText: {
    fontWeight: '600',
    color: overviewColors.positive,
  },
  dimensionTabContainer: {
    flex: 1,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: overviewSpacing.row,
  },
  monthArrow: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: overviewColors.surfacePressed,
  },
  hidden: {
    opacity: 0,
  },
  monthTitle: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  monthName: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: overviewColors.textPrimary,
  },
  card: {
    gap: overviewSpacing.block,
    padding: overviewSpacing.block,
    borderRadius: 20,
    backgroundColor: overviewColors.surfacePressed,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: overviewSpacing.tight,
  },
  hero: {
    flex: 1,
    gap: 2,
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
    color: overviewColors.textSecondary,
  },
  amount: {
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -1,
    color: overviewColors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  change: {
    flexShrink: 1,
    maxWidth: 132,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '600',
    color: overviewColors.textSecondary,
  },
  cardTotal: {
    paddingTop: overviewSpacing.row,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: overviewColors.hairline,
    fontSize: 13,
    lineHeight: 18,
    color: overviewColors.textSecondary,
  },
  section: {
    gap: overviewSpacing.tight,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.6,
    color: overviewColors.textSecondary,
  },
  dimensionSwitcher: {
    minHeight: 48,
    flexDirection: 'row',
    padding: 4,
    borderRadius: 16,
    backgroundColor: overviewColors.surfacePressed,
  },
  dimensionTab: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  dimensionSelected: {
    backgroundColor: overviewColors.textDisabled,
  },
  dimensionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: overviewColors.textSecondary,
  },
  dimensionLabelSelected: {
    color: overviewColors.textPrimary,
  },
  shareList: {
    gap: overviewSpacing.section,
    padding: overviewSpacing.block,
    borderRadius: 20,
    backgroundColor: overviewColors.surfacePressed,
  },
  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: overviewSpacing.row,
    minHeight: 44,
  },
  shareIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
  },
  shareIconText: {
    fontSize: 19,
    fontWeight: '700',
    color: overviewColors.background,
  },
  shareBody: {
    flex: 1,
    gap: 7,
  },
  shareHeading: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
  },
  shareName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: overviewColors.textPrimary,
  },
  shareValue: {
    fontSize: 15,
    fontWeight: '600',
    color: overviewColors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  shareTrack: {
    height: 6,
    overflow: 'hidden',
    borderRadius: 3,
    backgroundColor: overviewColors.surfacePressed,
  },
  shareFill: {
    borderRadius: 3,
  },
  shareDetail: {
    fontSize: 12,
    color: overviewColors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  showAllButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: overviewColors.hairline,
  },
  showAllLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: bubbleTints.net.film,
  },
  highlights: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: overviewSpacing.tight,
  },
  highlight: {
    flexGrow: 1,
    flexBasis: '45%',
    gap: 4,
    padding: overviewSpacing.block,
    borderRadius: 18,
    backgroundColor: overviewColors.surface,
  },
  highlightLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: overviewColors.textSecondary,
  },
  highlightValue: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: overviewColors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  highlightDetail: {
    fontSize: 12,
    color: overviewColors.textSecondary,
  },
});
