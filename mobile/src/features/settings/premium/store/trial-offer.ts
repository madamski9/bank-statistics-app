import type { PremiumReason } from '../premium-access';

export const trialTransactionThreshold = 15;

export type StoreOfferingId = 'standard' | 'trial';

export type TrialPeriodUnit = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';

const daysPerUnit: Record<TrialPeriodUnit, number> = { DAY: 1, WEEK: 7, MONTH: 30, YEAR: 365 };

interface TrialEligibility {
  capturedTransactionCount: number;
  reason: PremiumReason | null;
}

export function storeOfferingFor({ capturedTransactionCount, reason }: TrialEligibility): StoreOfferingId {
  return reason !== null || capturedTransactionCount >= trialTransactionThreshold ? 'trial' : 'standard';
}

export function trialDays(unit: string, count: number): number | null {
  return unit in daysPerUnit && count > 0 ? daysPerUnit[unit as TrialPeriodUnit] * count : null;
}
