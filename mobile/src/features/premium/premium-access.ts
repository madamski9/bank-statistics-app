import type { SpendingPeriod } from '@/features/spending-overview/periods';

export type PremiumReason = 'period' | 'limit' | 'widget' | 'category' | 'report' | 'event';

const freePeriods: readonly SpendingPeriod[] = ['currentMonth', 'week', 'month', 'quarter'];

export const freeLimitCount = 1;

export const fallbackPeriod: SpendingPeriod = 'currentMonth';

export function isPeriodAvailable(period: SpendingPeriod, isPremium: boolean): boolean {
  return isPremium || freePeriods.includes(period);
}

export function lockedPeriods(isPremium: boolean): ReadonlySet<SpendingPeriod> {
  return new Set(
    (['currentMonth', 'week', 'month', 'quarter', 'year', 'all'] as const).filter(
      (period) => !isPeriodAvailable(period, isPremium),
    ),
  );
}

export function canCreateLimit(existingLimitCount: number, isPremium: boolean): boolean {
  return isPremium || existingLimitCount < freeLimitCount;
}

export function canCreateCustomCategory(isPremium: boolean): boolean {
  return isPremium;
}

export function canOpenMonthlyReport(isPremium: boolean): boolean {
  return isPremium;
}

export function canStartEvent(isPremium: boolean): boolean {
  return isPremium;
}
