import { StyleSheet, Text, View } from 'react-native';

import { useCopy, useLanguage } from '@/features/app-shell/localization/language';
import { overviewSpacing } from '@/features/app-shell/theme/overview-theme';
import type { CategorizationRule } from '@/features/data/classification/categorization-rule';
import { reportingCurrency } from '@/features/data/currency-conversion/exchange-rate';
import { transactionTitle } from '@/features/home/transactions/record/transaction-record';
import { useAmountFormatting } from '@/features/settings/privacy/amounts/use-private-amounts';

import type { HighlightSelection } from '../../highlight-screen/monthly-highlight-screen';
import type { MonthlySummary } from '../../monthly-summary';
import { monthlySummaryCopy } from '../../monthly-summary-copy';
import { HighlightTile } from './highlight-tile';
import { summaryStyles } from './summary-styles';

interface MonthHighlightsProps {
  summary: MonthlySummary;
  busiestLabel: string | null;
  rules: CategorizationRule[];
  onSelectHighlight: (selection: HighlightSelection) => void;
}

export function MonthHighlights({ summary, busiestLabel, rules, onSelectHighlight }: MonthHighlightsProps) {
  const copy = useCopy(monthlySummaryCopy);
  const language = useLanguage();
  const { formatCompactAmount } = useAmountFormatting();
  const perDayCount = summary.transactionsPerDay.toFixed(1).replace('.', language === 'pl' ? ',' : '.');

  return (
    <View style={summaryStyles.section}>
      <Text maxFontSizeMultiplier={1.4} style={summaryStyles.sectionLabel}>
        {copy.highlights.toLocaleUpperCase()}
      </Text>
      <View style={styles.highlights}>
        {summary.busiestDay !== null && busiestLabel !== null ? (
          <HighlightTile
            accessibilityHint={copy.openDay}
            detail={busiestLabel}
            label={copy.busiestDay}
            onPress={() => {
              if (summary.busiestDay !== null) {
                onSelectHighlight({ kind: 'day', day: summary.busiestDay.day });
              }
            }}
            value={formatCompactAmount(summary.busiestDay.totalMinor, reportingCurrency)}
          />
        ) : null}
        {summary.largestExpense !== null ? (
          <HighlightTile
            accessibilityHint={copy.openHighlight}
            detail={transactionTitle(summary.largestExpense, rules)}
            label={copy.largest}
            onPress={() => onSelectHighlight({ kind: 'largest' })}
            value={formatCompactAmount(summary.largestExpense.amountMinor, reportingCurrency)}
          />
        ) : null}
        <HighlightTile
          accessibilityHint={copy.openHighlight}
          label={copy.noSpendDays}
          onPress={() => onSelectHighlight({ kind: 'noSpend' })}
          value={copy.noSpendValue(summary.noSpendDays, summary.elapsedDays)}
        />
        <HighlightTile
          accessibilityHint={copy.openHighlight}
          label={copy.perDayCount}
          onPress={() => onSelectHighlight({ kind: 'perDay' })}
          value={perDayCount}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  highlights: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: overviewSpacing.tight,
  },
});
