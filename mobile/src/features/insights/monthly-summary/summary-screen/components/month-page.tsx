import { memo } from 'react';
import { Text, View } from 'react-native';

import { calendarCopy } from '@/features/app-shell/localization/calendar-copy';
import { useCopy } from '@/features/app-shell/localization/language';
import type { CategorizationRule } from '@/features/data/classification/categorization-rule';

import { MonthComparisonChart } from '../../charts/month-comparison';
import type { SummaryGroupSelection } from '../../group-screen/monthly-group-screen';
import type { HighlightSelection } from '../../highlight-screen/monthly-highlight-screen';
import type { MonthComparison, MonthlySummary, SummaryMonth } from '../../monthly-summary';
import { monthlySummaryCopy } from '../../monthly-summary-copy';
import type { BreakdownDimension } from '../month-pages';
import { DailyAverageCard } from './daily-average-card';
import { MonthFlowSections } from './month-flow-sections';
import { MonthHighlights } from './month-highlights';
import { SpendingBreakdown } from './spending-breakdown';
import { summaryStyles } from './summary-styles';

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
  onSelectHighlight: (selection: HighlightSelection) => void;
}

export const MonthPage = memo(function MonthPage({
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
  onSelectHighlight,
}: MonthPageProps) {
  const copy = useCopy(monthlySummaryCopy);
  const calendar = useCopy(calendarCopy);
  const isEmpty = summary.expenseCount + summary.incomeCount === 0;
  const busiestLabel = summary.busiestDay === null
    ? null
    : calendar.dayMonth(summary.busiestDay.day, calendar.monthsInGenitive[month.month] ?? '');
  const activeDimension = summary.merchants.length === 0 ? 'category' : breakdownDimension;
  const groups = activeDimension === 'merchant' ? summary.merchants : summary.categories;

  return (
    <>
      <DailyAverageCard busiestLabel={busiestLabel} isActive={isActive} summary={summary} />

      {isEmpty ? (
        <Text maxFontSizeMultiplier={1.5} style={summaryStyles.caption}>
          {copy.empty}
        </Text>
      ) : null}

      {groups.length > 0 ? (
        <SpendingBreakdown
          activeDimension={activeDimension}
          isActive={isActive}
          onChangeDimension={onChangeDimension}
          onSelectGroup={onSelectGroup}
          onToggleShowAll={onToggleShowAll}
          showAllGroups={showAllGroups}
          summary={summary}
        />
      ) : null}

      <View style={summaryStyles.section}>
        <Text maxFontSizeMultiplier={1.4} style={summaryStyles.sectionLabel}>
          {copy.monthComparison.toLocaleUpperCase()}
        </Text>
        <Text maxFontSizeMultiplier={1.4} style={summaryStyles.caption}>
          {copy.monthComparisonDetail}
        </Text>
        <MonthComparisonChart isActive={isActive} months={comparedMonths} />
      </View>

      {!isEmpty ? (
        <>
          <MonthHighlights
            busiestLabel={busiestLabel}
            onSelectHighlight={onSelectHighlight}
            rules={rules}
            summary={summary}
          />
          <MonthFlowSections summary={summary} />
        </>
      ) : null}
    </>
  );
});
