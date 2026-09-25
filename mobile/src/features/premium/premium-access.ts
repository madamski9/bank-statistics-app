import type { SpendingPeriod } from '@/features/spending-overview/periods';

export type PremiumReason = 'period' | 'limit' | 'widget';

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

export const premiumReasonMessages: Record<PremiumReason, string> = {
  period: 'Ostatni rok i cała historia są dostępne w Premium.',
  limit: 'Bez Premium możesz mieć jeden limit wydatków.',
  widget: 'Widżety na ekranie głównym i blokady są dostępne w Premium.',
};
