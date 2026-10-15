import type { IngestionRecord } from '@bankstats/ingestion-native';
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';

import { calendarCopy } from '@/features/app-shell/localization/calendar-copy';
import { useCopy } from '@/features/app-shell/localization/language';
import { SheetSection } from '@/features/app-shell/sheet/components/sheet-section';
import { SheetSwitchRow } from '@/features/app-shell/sheet/components/sheet-switch-row';
import { SheetLayout } from '@/features/app-shell/sheet/sheet-layout';
import { overviewSpacing } from '@/features/app-shell/theme/overview-theme';
import type { CategorizationRule } from '@/features/data/classification/categorization-rule';
import type { SpendingEvent } from '@/features/insights/events/spending-event';
import type { RecurringPayment } from '@/features/insights/subscriptions/recurring-payments';

import { MonthlyGroupScreen, type SummaryGroupSelection } from '../group-screen/monthly-group-screen';
import { MonthlyHighlightScreen, type HighlightSelection } from '../highlight-screen/monthly-highlight-screen';
import { monthKey, parseMonthKey, summaryMonths, type SummaryMonth } from '../monthly-summary';
import { monthlySummaryCopy } from '../monthly-summary-copy';
import type { MonthlySummaryReminder } from '../reminder/use-monthly-summary-reminder';
import { MonthHeader, type MonthTravel } from './components/month-header';
import { MonthPage } from './components/month-page';
import { cachedPage, type BreakdownDimension, type MonthPageData } from './month-pages';
import { useMonthSwipe } from './use-month-swipe';

interface MonthlySummaryScreenProps {
  records: IngestionRecord[];
  rules: CategorizationRule[];
  events: SpendingEvent[];
  recurring: RecurringPayment[];
  initialMonth?: string | null;
  reminder: MonthlySummaryReminder;
  onClose: () => void;
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
  const now = useMemo(() => new Date(), []);
  const requestedMonth = useMemo(() => initialMonth === null ? null : parseMonthKey(initialMonth), [initialMonth]);
  const months = useMemo(() => summaryMonths(records, now, requestedMonth), [now, records, requestedMonth]);
  const [breakdownDimension, setBreakdownDimension] = useState<BreakdownDimension>('merchant');
  const [showAllGroups, setShowAllGroups] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<SummaryGroupSelection | null>(null);
  const [selectedHighlight, setSelectedHighlight] = useState<HighlightSelection | null>(null);
  const [travel, setTravel] = useState<MonthTravel | null>(null);
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
  const selectHighlight = useCallback((selection: HighlightSelection) => setSelectedHighlight(selection), []);

  const canShowOlder = index < months.length - 1;
  const canShowNewer = index > 0;
  const { swipe, dragStyle, move } = useMonthSwipe({
    selectedKey,
    travelDistance: pageWidth + overviewSpacing.gutter,
    canShowOlder,
    canShowNewer,
    onCommit: (direction) => {
      const next = months[index + direction];

      if (next === undefined) {
        return false;
      }

      setTravel(direction > 0 ? 'older' : 'newer');
      setSelectedKey(monthKey(next));
      setShowAllGroups(false);
      return true;
    },
  });

  if (selectedHighlight !== null) {
    return (
      <MonthlyHighlightScreen
        highlight={selectedHighlight}
        month={month}
        onBack={() => setSelectedHighlight(null)}
        onClose={onClose}
        records={records}
        rules={rules}
        summary={summary}
      />
    );
  }

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
      <MonthHeader
        canShowNewer={canShowNewer}
        canShowOlder={canShowOlder}
        isComplete={summary.isComplete}
        monthKey={selectedKey}
        onShowNewer={() => move(-1)}
        onShowOlder={() => move(1)}
        title={title}
        travel={travel}
      />

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
                  onSelectHighlight={selectHighlight}
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

const styles = StyleSheet.create({
  monthContent: {
    gap: overviewSpacing.section,
  },
  neighbourPage: {
    position: 'absolute',
    top: 0,
    width: '100%',
  },
});
