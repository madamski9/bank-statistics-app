import type { IngestionRecord } from '@bankstats/ingestion-native';

import type { RecurringPayment } from '@/features/subscriptions/recurring-payments';

export interface MonthForecast {
  monthStartMs: number;
  monthEndMs: number;
  spentMinor: number;
  projectedMinor: number;
  upcomingRecurringMinor: number;
  upcomingRecurringCount: number;
  dailyPaceMinor: number;
  elapsedDays: number;
  remainingDays: number;
  previousMonthMinor: number;
  isEarly: boolean;
  limit: LimitOutlook | null;
}

export interface LimitOutlook {
  targetMinor: number;
  isExceeded: boolean;
  isProjectedOver: boolean;
  crossingMs: number | null;
}

const dayMs = 86_400_000;
const earlyDays = 5;

function expensesBetween(records: IngestionRecord[], startMs: number, endMs: number): IngestionRecord[] {
  return records.filter((record) => {
    const occurredMs = new Date(record.occurredAt).getTime();

    return record.direction === 'expense' && occurredMs >= startMs && occurredMs < endMs;
  });
}

function total(records: IngestionRecord[]): number {
  return records.reduce((sum, record) => sum + record.amountMinor, 0);
}

export function monthForecast(
  records: IngestionRecord[],
  recurring: RecurringPayment[],
  now: Date,
  limitTargetMinor: number | null = null,
): MonthForecast {
  const monthStartMs = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const monthEndMs = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();
  const previousStartMs = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
  const nowMs = Math.min(Math.max(now.getTime(), monthStartMs), monthEndMs);
  const thisMonth = expensesBetween(records, monthStartMs, nowMs + 1);
  const recurringIds = new Set(
    recurring.filter((payment) => payment.isActive).flatMap((payment) => payment.records.map((record) => record.id)),
  );
  const spentMinor = total(thisMonth);
  const discretionaryMinor = total(thisMonth.filter((record) => !recurringIds.has(record.id)));
  const elapsedDays = Math.max((nowMs - monthStartMs) / dayMs, 1);
  const remainingDays = Math.max((monthEndMs - nowMs) / dayMs, 0);
  const dailyPaceMinor = discretionaryMinor / elapsedDays;
  const upcoming = recurring.filter((payment) => {
    const nextMs = new Date(payment.nextExpectedAt).getTime();

    return payment.isActive && nextMs > nowMs && nextMs < monthEndMs;
  });
  const upcomingRecurringMinor = upcoming.reduce((sum, payment) => sum + payment.lastAmountMinor, 0);
  const projectedMinor = Math.round(spentMinor + dailyPaceMinor * remainingDays + upcomingRecurringMinor);

  return {
    monthStartMs,
    monthEndMs,
    spentMinor,
    projectedMinor,
    upcomingRecurringMinor,
    upcomingRecurringCount: upcoming.length,
    dailyPaceMinor: Math.round(dailyPaceMinor),
    elapsedDays,
    remainingDays,
    previousMonthMinor: total(expensesBetween(records, previousStartMs, monthStartMs)),
    isEarly: elapsedDays < earlyDays,
    limit:
      limitTargetMinor === null || limitTargetMinor <= 0
        ? null
        : limitOutlook(limitTargetMinor, spentMinor, projectedMinor, dailyPaceMinor, nowMs, monthEndMs),
  };
}

function limitOutlook(
  targetMinor: number,
  spentMinor: number,
  projectedMinor: number,
  dailyPaceMinor: number,
  nowMs: number,
  monthEndMs: number,
): LimitOutlook {
  if (spentMinor >= targetMinor) {
    return { targetMinor, isExceeded: true, isProjectedOver: true, crossingMs: null };
  }

  const crossingMs =
    dailyPaceMinor > 0 ? nowMs + ((targetMinor - spentMinor) / dailyPaceMinor) * dayMs : null;

  return {
    targetMinor,
    isExceeded: false,
    isProjectedOver: projectedMinor > targetMinor,
    crossingMs: crossingMs !== null && crossingMs < monthEndMs ? crossingMs : null,
  };
}
