import type { DailyCategorySeries } from '../monthly-summary';

export function chartSeries(
  dailyCategories: DailyCategorySeries[],
  dailyExpensesMinor: number[],
  otherLabel: string,
): DailyCategorySeries[] {
  const mainSeries = dailyCategories.slice(0, 3);
  const remaining = dailyCategories.slice(3);

  if (remaining.length === 0) {
    return mainSeries;
  }

  return [
    ...mainSeries,
    {
      key: 'other',
      name: otherLabel,
      totalMinor: remaining.reduce((total, group) => total + group.totalMinor, 0),
      dailyMinor: dailyExpensesMinor.map((_, day) =>
        remaining.reduce((total, group) => total + (group.dailyMinor[day] ?? 0), 0),
      ),
    },
  ];
}

export function axisDaysFor(dayCount: number): number[] {
  return [1, 8, 15, 22, dayCount].filter((day, position, days) =>
    position === days.length - 1 || dayCount - day >= 4,
  );
}
