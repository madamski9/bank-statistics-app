import type { IngestionRecord } from '@bankstats/ingestion-native';

import type { RecurringPayment } from '@/features/subscriptions/recurring-payments';

export interface MonthForecast {
  monthStartMs: number;
  monthEndMs: number;
  spentMinor: number;
  projectedMinor: number;
  projectedVariableMinor: number;
  upcomingRecurringMinor: number;
  upcomingRecurringCount: number;
  historicalMonthsUsed: number;
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

const earlyDays = 5;
const minimumPaceDays = 7;
const fullPaceEvidenceDays = 5;
const maxHistoryMonths = 3;
const historyStartGraceDay = 3;
const earlyHistoryWeight = 0.8;
const historyWeightDecay = 0.45;
const typicalDayMultiplier = 3;

function median(values: number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length === 0) {
    return 0;
  }

  return sorted.length % 2 === 0
    ? ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
    : (sorted[middle] ?? 0);
}

function expensesBetween(records: IngestionRecord[], startMs: number, endMs: number): IngestionRecord[] {
  return records.filter((record) => {
    const occurredMs = new Date(record.occurredAt).getTime();

    return record.direction === 'expense' && occurredMs >= startMs && occurredMs < endMs;
  });
}

function total(records: IngestionRecord[]): number {
  return records.reduce((sum, record) => sum + record.amountMinor, 0);
}

function currentMonthRemainder(
  records: IngestionRecord[],
  elapsedDays: number,
  remainingDays: number,
): number {
  const dailyTotals = new Map<number, number>();

  for (const record of records) {
    const day = new Date(record.occurredAt).getDate();
    dailyTotals.set(day, (dailyTotals.get(day) ?? 0) + record.amountMinor);
  }

  const activeDays = [...dailyTotals.values()];
  const typicalActiveDay = median(activeDays);
  const dayCap = activeDays.length >= 3 ? typicalActiveDay * typicalDayMultiplier : Infinity;
  const adjustedSpentMinor = activeDays.reduce((sum, amount) => sum + Math.min(amount, dayCap), 0);
  const observedPaceMinor = adjustedSpentMinor / Math.max(elapsedDays, minimumPaceDays);
  const evidenceWeight = Math.min(activeDays.length / fullPaceEvidenceDays, 1)
    * Math.min(elapsedDays / minimumPaceDays, 1);

  return observedPaceMinor * remainingDays * evidenceWeight;
}

function historicalRemainders(
  records: IngestionRecord[],
  recurringIds: Set<string>,
  now: Date,
  elapsedDays: number,
  remainingDays: number,
): number[] {
  const recordedDates = records
    .map((record) => new Date(record.occurredAt))
    .filter((date) => !Number.isNaN(date.getTime()) && date.getTime() <= now.getTime());
  const firstDate = recordedDates.reduce<Date | null>(
    (earliest, date) => earliest === null || date.getTime() < earliest.getTime() ? date : earliest,
    null,
  );

  if (firstDate === null || remainingDays === 0) {
    return [];
  }

  const firstMonthStartMs = new Date(firstDate.getFullYear(), firstDate.getMonth(), 1).getTime();
  const remainders: number[] = [];

  for (let offset = 1; offset <= maxHistoryMonths; offset += 1) {
    const start = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - offset + 1, 1);
    const startMs = start.getTime();

    if (startMs < firstMonthStartMs || (startMs === firstMonthStartMs && firstDate.getDate() > historyStartGraceDay)) {
      continue;
    }

    const hasRecordedActivity = records.some((record) => {
      const occurredMs = new Date(record.occurredAt).getTime();

      return occurredMs >= startMs && occurredMs < end.getTime();
    });

    if (!hasRecordedActivity) {
      continue;
    }

    const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
    const daysAfter = Math.max(daysInMonth - elapsedDays, 0);

    if (daysAfter === 0) {
      remainders.push(0);
      continue;
    }

    const laterSpending = expensesBetween(records, startMs, end.getTime()).filter(
      (record) => !recurringIds.has(record.id) && new Date(record.occurredAt).getDate() > elapsedDays,
    );

    remainders.push(total(laterSpending) * remainingDays / daysAfter);
  }

  return remainders;
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
    recurring.flatMap((payment) => payment.records.map((record) => record.id)),
  );
  const spentMinor = total(thisMonth);
  const discretionary = thisMonth.filter((record) => !recurringIds.has(record.id));
  const elapsedDays = now.getDate();
  const remainingDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - elapsedDays;
  const observedRemainder = currentMonthRemainder(discretionary, elapsedDays, remainingDays);
  const pastRemainders = historicalRemainders(records, recurringIds, now, elapsedDays, remainingDays);
  const historicalWeight = Math.min(pastRemainders.length / 2, 1)
    * (earlyHistoryWeight - historyWeightDecay * (elapsedDays / (elapsedDays + remainingDays)));
  const projectedVariableMinor = Math.round(
    observedRemainder * (1 - historicalWeight) + median(pastRemainders) * historicalWeight,
  );
  const upcoming = recurring.filter((payment) => {
    const nextMs = new Date(payment.nextExpectedAt).getTime();

    return payment.isActive && nextMs > nowMs && nextMs < monthEndMs;
  });
  const upcomingRecurringMinor = upcoming.reduce((sum, payment) => sum + payment.lastAmountMinor, 0);
  const projectedMinor = spentMinor + projectedVariableMinor + upcomingRecurringMinor;

  return {
    monthStartMs,
    monthEndMs,
    spentMinor,
    projectedMinor,
    projectedVariableMinor,
    upcomingRecurringMinor,
    upcomingRecurringCount: upcoming.length,
    historicalMonthsUsed: pastRemainders.length,
    elapsedDays,
    remainingDays,
    previousMonthMinor: total(expensesBetween(records, previousStartMs, monthStartMs)),
    isEarly: elapsedDays < earlyDays,
    limit:
      limitTargetMinor === null || limitTargetMinor <= 0
        ? null
        : limitOutlook(limitTargetMinor, spentMinor, projectedMinor, nowMs, monthEndMs),
  };
}

function limitOutlook(
  targetMinor: number,
  spentMinor: number,
  projectedMinor: number,
  nowMs: number,
  monthEndMs: number,
): LimitOutlook {
  if (spentMinor >= targetMinor) {
    return { targetMinor, isExceeded: true, isProjectedOver: true, crossingMs: null };
  }

  const crossingMs = projectedMinor > targetMinor
    ? nowMs + ((targetMinor - spentMinor) / (projectedMinor - spentMinor)) * (monthEndMs - nowMs)
    : null;

  return {
    targetMinor,
    isExceeded: false,
    isProjectedOver: projectedMinor > targetMinor,
    crossingMs: crossingMs !== null && crossingMs < monthEndMs ? crossingMs : null,
  };
}
