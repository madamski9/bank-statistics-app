import { useCallback, useReducer, useState } from 'react';

import type { IngestionRecord } from '@bankstats/ingestion-native';

import type { BubbleKey } from '@/features/app-shell/theme/overview-theme';
import type { CategorizationRule } from '@/features/data/classification/categorization-rule';
import { groupSpending, type SpendingGroup } from '@/features/data/classification/spending-groups';
import { bubbleSelectionReducer, initialBubbleSelection } from '@/features/home/overview/bubbles/bubble-selection';
import type { BubbleOrigin } from '@/features/home/overview/bubbles/glass-bubble';
import type { PeriodWindow } from '@/features/home/overview/period/periods';
import {
  periodChange,
  type SpendingSource,
  type SpendingSummary,
} from '@/features/home/overview/spending/spending-summary';

interface SpendingSelectionOptions {
  countedRecords: IngestionRecord[];
  rules: CategorizationRule[];
  spendWindow: PeriodWindow;
  summary: SpendingSummary;
  previousSummary: SpendingSummary | null;
}

export function useSpendingSelection({
  countedRecords,
  rules,
  spendWindow,
  summary,
  previousSummary,
}: SpendingSelectionOptions) {
  const [{ selection, revision }, dispatchSelection] = useReducer(
    bubbleSelectionReducer,
    initialBubbleSelection,
  );
  const [group, setGroup] = useState<SpendingGroup | null>(null);

  const selectBubble = useCallback((key: BubbleKey, origin: BubbleOrigin) => {
    dispatchSelection({ type: 'select', selection: { key, origin } });
  }, []);

  const closeBubble = useCallback(() => {
    dispatchSelection({ type: 'closed', revision });
  }, [revision]);

  const selectSource = useCallback(
    (source: SpendingSource) => {
      if (source.group === null) {
        return;
      }

      const { dimension: sourceDimension, key } = source.group;
      const match = groupSpending(countedRecords, {
        window: spendWindow,
        rules,
        dimension: sourceDimension,
      }).find((candidate) => candidate.key === key);

      if (match !== undefined) {
        setGroup(match);
      }
    },
    [countedRecords, rules, spendWindow],
  );

  const closeGroup = useCallback(() => {
    setGroup(null);
  }, []);

  const selectedChange =
    previousSummary === null || selection === null
      ? null
      : selection.key === 'expense'
        ? periodChange(summary.expenseMinor, previousSummary.expenseMinor)
        : selection.key === 'income'
          ? periodChange(summary.incomeMinor, previousSummary.incomeMinor)
          : periodChange(summary.netMinor, previousSummary.netMinor);

  return {
    selection,
    revision,
    selectedChange,
    group,
    selectGroup: setGroup,
    selectBubble,
    closeBubble,
    selectSource,
    closeGroup,
  };
}
