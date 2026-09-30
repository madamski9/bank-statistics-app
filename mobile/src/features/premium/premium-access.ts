import type { SpendingPeriod } from '@/features/spending-overview/periods';

export type PremiumReason = 'period' | 'limit' | 'widget' | 'category';

const freePeriods: readonly SpendingPeriod[] = ['week', 'month', 'quarter'];

export const freeLimitCount = 1;

export const fallbackPeriod: SpendingPeriod = 'month';

export function isPeriodAvailable(period: SpendingPeriod, isPremium: boolean): boolean {
  return isPremium || freePeriods.includes(period);
}

export function lockedPeriods(isPremium: boolean): ReadonlySet<SpendingPeriod> {
  return new Set(
    (['week', 'month', 'quarter', 'year', 'all'] as const).filter(
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
