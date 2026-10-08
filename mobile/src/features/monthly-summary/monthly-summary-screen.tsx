import type { IngestionRecord } from '@bankstats/ingestion-native';
import { SymbolView } from 'expo-symbols';
import { memo, useCallback, useDeferredValue, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  FadeIn,
  FadeInLeft,
  FadeInRight,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import type { CategorizationRule } from '@/features/classification/categorization-rule';
import type { SpendingGroup } from '@/features/classification/spending-groups';
import { reportingCurrency } from '@/features/currency-conversion/exchange-rate';
import type { SpendingEvent } from '@/features/events/spending-event';
import { calendarCopy } from '@/features/localization/calendar-copy';
import { useCopy, useLanguage } from '@/features/localization/language';
import { AmountText } from '@/features/privacy/amount-text';
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
  type MonthComparison,
  type MonthlySummary,
  type SummaryMonth,
} from './monthly-summary';
import { monthlySummaryCopy } from './monthly-summary-copy';
import { reportSeriesColors } from './report-colors';
import type { MonthlySummaryReminder } from './use-monthly-summary-reminder';

const swipeDistance = 72;
const swipeVelocity = 600;
const edgeResistance = 0.2;
const settleMinMs = 140;
const settleMaxMs = 280;
const settleEasing = Easing.out(Easing.cubic);

type BreakdownDimension = 'merchant' | 'category';

interface MonthPageData {
  offset: -1 | 0 | 1;
  month: SummaryMonth;
  summary: MonthlySummary;
  comparedMonths: MonthComparison[];
}

type CachedPage = Omit<MonthPageData, 'offset'>;

type SummaryOptions = Parameters<typeof summarizeMonth>[2];

interface PageCacheEntry {
  options: SummaryOptions;
  page: CachedPage;
}

const pageCache = new WeakMap<IngestionRecord[], Map<string, PageCacheEntry>>();

function cachedPage(records: IngestionRecord[], month: SummaryMonth, options: SummaryOptions): CachedPage {
  const byMonth = pageCache.get(records) ?? new Map<string, PageCacheEntry>();
  const key = monthKey(month);
  const cached = byMonth.get(key);

  pageCache.set(records, byMonth);

  if (
    cached !== undefined &&
    cached.options.rules === options.rules &&
    cached.options.events === options.events &&
    cached.options.recurring === options.recurring &&
    cached.options.now === options.now
  ) {
    return cached.page;
  }

  const page = {
    month,
    summary: summarizeMonth(records, month, options),
    comparedMonths: compareMonths(records, month, options.now),
  };

  byMonth.set(key, { options, page });

  return page;
}

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
  isActive: boolean;
  accessibilityHint: string;
  onPress: () => void;
}

function ShareRow({ group, index, fraction, value, detail, tint, isActive, accessibilityHint, onPress }: ShareRowProps) {
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
          <AmountText maxFontSizeMultiplier={1.4} style={styles.shareValue}>
            {value}
          </AmountText>
        </View>
        <View style={styles.shareTrack}>
          <GrowingFill
            color={tint}
            delayMs={120 + index * 50}
            fraction={Math.max(fraction, 0.02)}
            isActive={isActive}
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
      <AmountText maxFontSizeMultiplier={1.4} numberOfLines={1} style={styles.highlightLabel}>
        {label}
      </AmountText>
      <AmountText adjustsFontSizeToFit maxFontSizeMultiplier={1.3} numberOfLines={1} style={styles.highlightValue}>
        {value}
      </AmountText>
      {detail !== undefined ? (
        <Text maxFontSizeMultiplier={1.4} numberOfLines={1} style={styles.highlightDetail}>
          {detail}
        </Text>
      ) : null}
    </View>
  );
}

interface MonthPageProps {
  month: SummaryMonth;
  summary: MonthlySummary;
  comparedMonths: MonthComparison[];
  rules: CategorizationRule[];
  breakdownDimension: BreakdownDimension;
  showAllGroups: boolean;
  isActive: boolean;
  onChangeDimension: (dimension: BreakdownDimension) => void;
  onToggleShowAll: () => void;
  onSelectGroup: (selection: SummaryGroupSelection) => void;
}

const MonthPage = memo(function MonthPage({
  month,
  summary,
  comparedMonths,
  rules,
  breakdownDimension,
  showAllGroups,
  isActive,
  onChangeDimension,
  onToggleShowAll,
  onSelectGroup,
}: MonthPageProps) {
  const copy = useCopy(monthlySummaryCopy);
  const calendar = useCopy(calendarCopy);
  const language = useLanguage();
  const { formatAmount, formatCompactAmount, formatSignedAmount } = useAmountFormatting();
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

  return (
    <>
      <View style={styles.card}>
        <View style={styles.heroRow}>
          <View style={styles.hero}>
            <View style={styles.averageCaption}>
              <View style={styles.averageSwatch} />
              <Text maxFontSizeMultiplier={1.4} style={[styles.caption, styles.averageCaptionText]}>
                {copy.dailyAverage}
              </Text>
            </View>
            <AmountText adjustsFontSizeToFit maxFontSizeMultiplier={1.3} numberOfLines={1} style={styles.amount}>
              {formatAmount(summary.dailyExpenseMinor, reportingCurrency)}
            </AmountText>
          </View>
          {change !== null ? (
            <AmountText
              maxFontSizeMultiplier={1.4}
              numberOfLines={2}
              style={[styles.change, { color: change > 0 ? overviewColors.negative : overviewColors.positive }]}
            >
              {copy.versusPrevious(formatChange(change), change > 0)}
            </AmountText>
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
          isActive={isActive}
          otherLabel={copy.other}
        />
        <AmountText maxFontSizeMultiplier={1.4} style={styles.cardTotal}>
          {copy.total(
            formatAmount(summary.expenseMinor, reportingCurrency),
            formatTransactionCount(summary.expenseCount),
          )}
        </AmountText>
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
                    onChangeDimension(dimension);
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
                isActive={isActive}
                key={group.key}
                onPress={() => {
                  selectionChanged();
                  onSelectGroup({ dimension: activeDimension, key: group.key, name: group.name });
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
                  onToggleShowAll();
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
        <MonthComparisonChart isActive={isActive} months={comparedMonths} />
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
    </>
  );
});

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
  const now = useMemo(() => new Date(), []);
  const requestedMonth = useMemo(() => initialMonth === null ? null : parseMonthKey(initialMonth), [initialMonth]);
  const months = useMemo(() => summaryMonths(records, now, requestedMonth), [now, records, requestedMonth]);
  const [breakdownDimension, setBreakdownDimension] = useState<BreakdownDimension>('merchant');
  const [showAllGroups, setShowAllGroups] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<SummaryGroupSelection | null>(null);
  const [travel, setTravel] = useState<'older' | 'newer' | null>(null);
  const { width: screenWidth } = useWindowDimensions();
  const [pageWidth, setPageWidth] = useState(screenWidth - overviewSpacing.gutter * 2);
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
  const deferredIndex = useDeferredValue(index);
  const pages = useMemo(() => {
    const options = { rules, events, recurring, now };
    const isPrepared = (candidate: number) => Math.abs(candidate - deferredIndex) <= 1;
    const older = months[index + 1];
    const newer = index > 0 ? months[index - 1] : undefined;
    const result: MonthPageData[] = [{ offset: 0, ...cachedPage(records, month, options) }];

    if (older !== undefined && isPrepared(index + 1)) {
      result.push({ offset: -1, ...cachedPage(records, older, options) });
    }

    if (newer !== undefined && isPrepared(index - 1)) {
      result.push({ offset: 1, ...cachedPage(records, newer, options) });
    }

    return result;
  }, [deferredIndex, events, index, month, months, now, records, recurring, rules]);
  const summary = pages[0].summary;
  const title = `${calendar.monthNames[month.month] ?? ''} ${month.year}`;

  const changeDimension = useCallback((dimension: BreakdownDimension) => {
    setBreakdownDimension(dimension);
    setShowAllGroups(false);
  }, []);
  const toggleShowAll = useCallback(() => setShowAllGroups((current) => !current), []);
  const selectGroup = useCallback((selection: SummaryGroupSelection) => setSelectedGroup(selection), []);

  const canShowOlder = index < months.length - 1;
  const canShowNewer = index > 0;
  const travelDistance = pageWidth + overviewSpacing.gutter;
  const drag = useSharedValue(0);
  const isSettling = useSharedValue(false);

  useLayoutEffect(() => {
    drag.set(0);
    isSettling.set(false);
  }, [drag, isSettling, selectedKey]);

  const commitMove = (direction: number) => {
    const next = months[index + direction];

    if (next === undefined) {
      isSettling.set(false);
      return;
    }

    setTravel(direction > 0 ? 'older' : 'newer');
    setSelectedKey(monthKey(next));
    setShowAllGroups(false);
  };

  const settleTo = (direction: number, velocity: number) => {
    'worklet';
    const remaining = Math.abs(direction * travelDistance - drag.get());
    const speed = Math.abs(velocity);
    const duration = speed > 0
      ? Math.min(Math.max((remaining / speed) * 1000 * 1.6, settleMinMs), settleMaxMs)
      : settleMaxMs;

    isSettling.set(true);
    drag.set(
      withTiming(
        direction * travelDistance,
        { duration, easing: settleEasing, reduceMotion: ReduceMotion.System },
        (finished) => {
          if (finished) {
            scheduleOnRN(commitMove, direction);
          } else {
            isSettling.set(false);
          }
        },
      ),
    );
  };

  const move = (direction: number) => {
    const isAllowed = direction > 0 ? canShowOlder : canShowNewer;

    if (!isAllowed || isSettling.get()) {
      return;
    }

    selectionChanged();
    settleTo(direction, 0);
  };

  const swipe = Gesture.Pan()
    .activeOffsetX([-16, 16])
    .failOffsetY([-12, 12])
    .onUpdate((event) => {
      if (isSettling.get()) {
        return;
      }

      const isBlocked = event.translationX > 0 ? !canShowOlder : !canShowNewer;

      drag.set(isBlocked ? event.translationX * edgeResistance : event.translationX);
    })
    .onEnd((event) => {
      if (isSettling.get()) {
        return;
      }

      const direction = event.translationX > 0 ? 1 : -1;
      const isAllowed = direction > 0 ? canShowOlder : canShowNewer;
      const isFlung = Math.abs(event.velocityX) > swipeVelocity && Math.sign(event.velocityX) === direction;

      if (isAllowed && (Math.abs(event.translationX) > swipeDistance || isFlung)) {
        scheduleOnRN(selectionChanged);
        settleTo(direction, event.velocityX);
        return;
      }

      drag.set(withSpring(0, { duration: 400, dampingRatio: 0.8, velocity: event.velocityX }));
    });
  const dragStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: drag.get() }],
  }));

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

      <GestureDetector gesture={swipe}>
        <Animated.View onLayout={(event) => setPageWidth(event.nativeEvent.layout.width)} style={dragStyle}>
          {pages.map((page) => {
            const isCurrent = page.offset === 0;

            return (
              <View
                accessibilityElementsHidden={!isCurrent}
                importantForAccessibility={isCurrent ? 'auto' : 'no-hide-descendants'}
                key={monthKey(page.month)}
                pointerEvents={isCurrent ? 'auto' : 'none'}
                style={[
                  styles.monthContent,
                  isCurrent ? null : [styles.neighbourPage, { left: page.offset * (pageWidth + overviewSpacing.gutter) }],
                ]}
              >
                <MonthPage
                  breakdownDimension={breakdownDimension}
                  comparedMonths={page.comparedMonths}
                  month={page.month}
                  onChangeDimension={changeDimension}
                  onSelectGroup={selectGroup}
                  onToggleShowAll={toggleShowAll}
                  rules={rules}
                  isActive={isCurrent}
                  showAllGroups={isCurrent && showAllGroups}
                  summary={page.summary}
                />
              </View>
            );
          })}
        </Animated.View>
      </GestureDetector>

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

  return transition.springify().duration(250).dampingRatio(0.9).reduceMotion(ReduceMotion.System);
}

const styles = StyleSheet.create({
  monthContent: {
    gap: overviewSpacing.section,
  },
  neighbourPage: {
    position: 'absolute',
    top: 0,
    width: '100%',
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
