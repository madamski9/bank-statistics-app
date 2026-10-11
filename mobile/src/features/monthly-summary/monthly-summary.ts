import type { IngestionRecord } from '@bankstats/ingestion-native';

import type { CategorizationRule } from '@/features/classification/categorization-rule';
import { groupSpending, type SpendingDimension, type SpendingGroup } from '@/features/classification/spending-groups';
import { recordsOfEvent, type SpendingEvent } from '@/features/events/spending-event';
import type { RecurringPayment } from '@/features/subscriptions/recurring-payments';

export interface SummaryMonth {
  year: number;
  month: number;
}

export interface EventInMonth {
  event: SpendingEvent;
  expenseMinor: number;
}

export interface BusiestDay {
  day: number;
  totalMinor: number;
}

export interface DailyCategorySeries {
  key: string;
  name: string;
  totalMinor: number;
  dailyMinor: number[];
}

export interface MonthComparison {
  month: SummaryMonth;
  dailyAverageMinor: number;
}

export interface MonthlySummary {
  month: SummaryMonth;
  isComplete: boolean;
  dayCount: number;
  elapsedDays: number;
  dailyExpensesMinor: number[];
  dailyCategories: DailyCategorySeries[];
  previousDailyExpenseMinor: number;
  dailyExpenseChange: number | null;
  noSpendDays: number;
  busiestDay: BusiestDay | null;
  transactionsPerDay: number;
  expenseMinor: number;
  incomeMinor: number;
  netMinor: number;
  expenseCount: number;
  incomeCount: number;
  dailyExpenseMinor: number;
  previousExpenseMinor: number;
  expenseChange: number | null;
  categories: SpendingGroup[];
  merchants: SpendingGroup[];
  largestExpense: IngestionRecord | null;
  recurringMinor: number;
  events: EventInMonth[];
}

export function monthKey({ year, month }: SummaryMonth): string {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

export function parseMonthKey(key: string): SummaryMonth | null {
  const match = /^(\d{4})-(\d{2})$/.exec(key);

  if (match === null) {
    return null;
  }

  const month = Number.parseInt(match[2] ?? '', 10) - 1;

  return month >= 0 && month < 12 ? { year: Number.parseInt(match[1] ?? '', 10), month } : null;
}

export function monthOf(moment: Date): SummaryMonth {
  return { year: moment.getFullYear(), month: moment.getMonth() };
}

export function shiftMonth({ year, month }: SummaryMonth, delta: number): SummaryMonth {
  const moment = new Date(year, month + delta, 1);

  return monthOf(moment);
}

function monthBounds(month: SummaryMonth): { startMs: number; endMs: number } {
  return {
    startMs: new Date(month.year, month.month, 1).getTime(),
    endMs: new Date(month.year, month.month + 1, 1).getTime(),
  };
}

function daysIn(month: SummaryMonth): number {
  return new Date(month.year, month.month + 1, 0).getDate();
}

function elapsedDaysIn(month: SummaryMonth, now: Date): number {
  const { startMs, endMs } = monthBounds(month);

  if (now.getTime() >= endMs) {
    return daysIn(month);
  }

  return now.getTime() < startMs ? 1 : now.getDate();
}

function dailyTotals(expenses: IngestionRecord[], dayCount: number): number[] {
  const totals = Array.from({ length: dayCount }, () => 0);

  for (const record of expenses) {
    const day = new Date(record.occurredAt).getDate() - 1;

    if (day >= 0 && day < dayCount) {
      totals[day] = (totals[day] ?? 0) + record.amountMinor;
    }
  }

  return totals;
}

function busiestOf(totals: number[]): BusiestDay | null {
  return totals.reduce<BusiestDay | null>(
    (busiest, totalMinor, index) =>
      totalMinor > 0 && (busiest === null || totalMinor > busiest.totalMinor)
        ? { day: index + 1, totalMinor }
        : busiest,
    null,
  );
}

function within(records: IngestionRecord[], startMs: number, endMs: number): IngestionRecord[] {
  return records.filter((record) => {
    const occurredMs = new Date(record.occurredAt).getTime();

    return occurredMs >= startMs && occurredMs < endMs;
  });
}

function sum(records: IngestionRecord[]): number {
  return records.reduce((total, record) => total + record.amountMinor, 0);
}

export function summaryMonths(
  records: IngestionRecord[],
  now: Date,
  requested: SummaryMonth | null = null,
): SummaryMonth[] {
  const current = monthOf(now);
  let first = shiftMonth(current, -1);

  if (requested !== null && requested.year * 12 + requested.month < first.year * 12 + first.month) {
    first = requested;
  }

  for (const record of records) {
    const occurred = new Date(record.occurredAt);

    if (!Number.isNaN(occurred.getTime()) && occurred.getTime() <= now.getTime()) {
      const recorded = monthOf(occurred);

      if (recorded.year * 12 + recorded.month < first.year * 12 + first.month) {
        first = recorded;
      }
    }
  }

  const count = (current.year - first.year) * 12 + current.month - first.month + 1;

  return Array.from({ length: count }, (_, index) => shiftMonth(current, -index));
}

export function compareMonths(
  records: IngestionRecord[],
  month: SummaryMonth,
  now: Date,
  count = 6,
): MonthComparison[] {
  return Array.from({ length: count }, (_, index) => {
    const compared = shiftMonth(month, index - count + 1);
    const { startMs, endMs } = monthBounds(compared);
    const expenseMinor = sum(
      within(records, startMs, endMs).filter((record) => record.direction === 'expense'),
    );
    const elapsedDays = elapsedDaysIn(compared, now);

    return { month: compared, dailyAverageMinor: Math.round(expenseMinor / elapsedDays) };
  });
}

export interface ExpenseDay {
  day: number;
  totalMinor: number;
  records: IngestionRecord[];
}

export function expenseDaysOf(records: IngestionRecord[], month: SummaryMonth): ExpenseDay[] {
  const { startMs, endMs } = monthBounds(month);
  const recordsByDay = new Map<number, IngestionRecord[]>();

  for (const record of within(records, startMs, endMs)) {
    if (record.direction !== 'expense') {
      continue;
    }

    const day = new Date(record.occurredAt).getDate();

    recordsByDay.set(day, [...(recordsByDay.get(day) ?? []), record]);
  }

  return [...recordsByDay.entries()]
    .map(([day, dayRecords]) => ({
      day,
      totalMinor: dayRecords.reduce((total, record) => total + record.amountMinor, 0),
      records: [...dayRecords].sort((left, right) => right.amountMinor - left.amountMinor),
    }))
    .sort((left, right) => right.totalMinor - left.totalMinor || left.day - right.day);
}

export function recordsForSummaryGroup(
  records: IngestionRecord[],
  month: SummaryMonth,
  rules: CategorizationRule[],
  dimension: Extract<SpendingDimension, 'merchant' | 'category'>,
  key: string,
): IngestionRecord[] {
  const firstMonth = shiftMonth(month, -5);
  const window = {
    startMs: new Date(firstMonth.year, firstMonth.month, 1).getTime(),
    endMs: new Date(month.year, month.month + 1, 1).getTime(),
  };

  return groupSpending(records, { window, rules, dimension }).find((group) => group.key === key)?.records ?? [];
}

export function summarizeMonth(
  records: IngestionRecord[],
  month: SummaryMonth,
  options: {
    rules: CategorizationRule[];
    events: SpendingEvent[];
    recurring: RecurringPayment[];
    now: Date;
  },
): MonthlySummary {
  const { startMs, endMs } = monthBounds(month);
  const previousMonth = shiftMonth(month, -1);
  const previous = monthBounds(previousMonth);
  const inMonth = within(records, startMs, endMs);
  const expenses = inMonth.filter((record) => record.direction === 'expense');
  const incomes = inMonth.filter((record) => record.direction === 'income');
  const previousExpenseMinor = sum(
    within(records, previous.startMs, previous.endMs).filter((record) => record.direction === 'expense'),
  );
  const expenseMinor = sum(expenses);
  const incomeMinor = sum(incomes);
  const window = { startMs, endMs };
  const isComplete = options.now.getTime() >= endMs;
  const dayCount = daysIn(month);
  const elapsedDays = elapsedDaysIn(month, options.now);
  const dailyExpensesMinor = dailyTotals(expenses, dayCount);
  const dailyExpenseMinor = Math.round(expenseMinor / elapsedDays);
  const previousDailyExpenseMinor = Math.round(previousExpenseMinor / daysIn(previousMonth));
  const categories = groupSpending(inMonth, { window, rules: options.rules, dimension: 'category' });
  const merchants = groupSpending(inMonth, { window, rules: options.rules, dimension: 'merchant' });
  const recurringIds = new Set(
    options.recurring.flatMap((payment) => payment.records.map((record) => record.id)),
  );

  return {
    month,
    isComplete,
    dayCount,
    elapsedDays,
    dailyExpensesMinor,
    dailyCategories: categories.map((group) => ({
      key: group.key,
      name: group.name,
      totalMinor: group.totalMinor,
      dailyMinor: dailyTotals(group.records, dayCount),
    })),
    previousDailyExpenseMinor,
    dailyExpenseChange:
      previousDailyExpenseMinor === 0
        ? null
        : (dailyExpenseMinor - previousDailyExpenseMinor) / previousDailyExpenseMinor,
    noSpendDays: dailyExpensesMinor.slice(0, elapsedDays).filter((total) => total === 0).length,
    busiestDay: busiestOf(dailyExpensesMinor),
    transactionsPerDay: expenses.length / elapsedDays,
    expenseMinor,
    incomeMinor,
    netMinor: incomeMinor - expenseMinor,
    expenseCount: expenses.length,
    incomeCount: incomes.length,
    dailyExpenseMinor,
    previousExpenseMinor,
    expenseChange:
      previousExpenseMinor === 0 ? null : (expenseMinor - previousExpenseMinor) / previousExpenseMinor,
    categories,
    merchants,
    largestExpense: expenses.reduce<IngestionRecord | null>(
      (largest, record) => (largest === null || record.amountMinor > largest.amountMinor ? record : largest),
      null,
    ),
    recurringMinor: sum(expenses.filter((record) => recurringIds.has(record.id))),
    events: options.events
      .map((event) => ({
        event,
        expenseMinor: sum(recordsOfEvent(expenses, event, options.events)),
      }))
      .filter((entry) => entry.expenseMinor > 0)
      .sort((left, right) => right.expenseMinor - left.expenseMinor),
  };
}
