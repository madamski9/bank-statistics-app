import type { IngestionRecord } from '@bankstats/ingestion-native';

import type { CategorizationRule } from '@/features/data/classification/categorization-rule';
import { groupSpending, type SpendingGroup } from '@/features/data/classification/spending-groups';
import type { PeriodWindow, SpendingPeriod } from '@/features/home/overview/period/periods';

export const merchantDetailPeriods: readonly SpendingPeriod[] = ['week', 'month', 'quarter', 'all'];

export function groupInWindow(
  group: SpendingGroup,
  records: IngestionRecord[],
  window: PeriodWindow,
  rules: CategorizationRule[],
): SpendingGroup {
  const match = groupSpending(records, { window, rules, dimension: group.dimension }).find(
    (candidate) => candidate.key === group.key,
  );

  return (
    match ?? {
      ...group,
      totalMinor: 0,
      count: 0,
      share: 0,
      averageMinor: 0,
      records: [],
    }
  );
}
