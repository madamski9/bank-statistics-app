import type { IngestionRecord } from '@bankstats/ingestion-native';

import type { CategorizationRule } from '@/features/classification/categorization-rule';
import { groupSpending, type SpendingGroup } from '@/features/classification/spending-groups';
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

export interface MonthlySummary {
  month: SummaryMonth;
  isComplete: boolean;
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

const maximumCategories = 5;
const maximumMerchants = 3;

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

function within(records: IngestionRecord[], startMs: number, endMs: number): IngestionRecord[] {
  return records.filter((record) => {
    const occurredMs = new Date(record.occurredAt).getTime();

    return occurredMs >= startMs && occurredMs < endMs;
  });
}

function sum(records: IngestionRecord[]): number {
  return records.reduce((total, record) => total + record.amountMinor, 0);
}

export function summaryMonths(records: IngestionRecord[], now: Date): SummaryMonth[] {
  const keys = new Set<string>([monthKey(monthOf(now))]);

  for (const record of records) {
    const occurred = new Date(record.occurredAt);

    if (!Number.isNaN(occurred.getTime()) && occurred.getTime() <= now.getTime()) {
      keys.add(monthKey(monthOf(occurred)));
    }
  }

  return [...keys]
    .sort((left, right) => right.localeCompare(left))
    .map(parseMonthKey)
    .filter((month): month is SummaryMonth => month !== null);
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
  const previous = monthBounds(shiftMonth(month, -1));
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
  const elapsedDays = Math.max(
    1,
    Math.ceil((Math.min(options.now.getTime(), endMs) - startMs) / 86_400_000),
  );
  const recurringIds = new Set(
    options.recurring.flatMap((payment) => payment.records.map((record) => record.id)),
  );

  return {
    month,
    isComplete,
    expenseMinor,
    incomeMinor,
    netMinor: incomeMinor - expenseMinor,
    expenseCount: expenses.length,
    incomeCount: incomes.length,
    dailyExpenseMinor: Math.round(expenseMinor / elapsedDays),
    previousExpenseMinor,
    expenseChange:
      previousExpenseMinor === 0 ? null : (expenseMinor - previousExpenseMinor) / previousExpenseMinor,
    categories: groupSpending(inMonth, { window, rules: options.rules, dimension: 'category' }).slice(
      0,
      maximumCategories,
    ),
    merchants: groupSpending(inMonth, { window, rules: options.rules, dimension: 'merchant' }).slice(
      0,
      maximumMerchants,
    ),
    largestExpense: expenses.reduce<IngestionRecord | null>(
      (largest, record) => (largest === null || record.amountMinor > largest.amountMinor ? record : largest),
      null,
    ),
    recurringMinor: sum(expenses.filter((record) => recurringIds.has(record.id))),
    events: options.events
      .map((event) => ({
        event,
        expenseMinor: sum(
          recordsOfEvent(expenses, event, options.events),
        ),
      }))
      .filter((entry) => entry.expenseMinor > 0)
      .sort((left, right) => right.expenseMinor - left.expenseMinor),
  };
}
