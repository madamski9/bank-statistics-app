import type { AlertPeriod } from '../evaluation/alert-period';

export type AlertMetric = 'expense' | 'income' | 'netFlow';

export type AlertScope =
  | { kind: 'all' }
  | { kind: 'merchant'; key: string; name: string }
  | { kind: 'counterparty'; name: string }
  | { kind: 'category'; id: string };

export type AlertCondition = 'threshold' | 'missingIncome';

export const alertTones = ['passive', 'mild', 'aggressive'] as const;

export type AlertTone = (typeof alertTones)[number];

export const defaultAlertTone: AlertTone = 'mild';

export const notificationShares = [0.5, 0.8, 0.9, 1];

export interface AlertRule {
  id: string;
  metric: AlertMetric;
  scope: AlertScope;
  period: AlertPeriod;
  condition: AlertCondition;
  targetMinor: number;
  thresholdShares: number[];
  isActive: boolean;
  createdAt: string;
  tone?: AlertTone;
}

export function isSilenced(rule: Pick<AlertRule, 'thresholdShares'>): boolean {
  return rule.thresholdShares.length === 0;
}

export type ToneDelivery = 'everyPayment' | 'crossing';

export function toneDelivery(rule: Pick<AlertRule, 'metric' | 'scope' | 'condition'>): ToneDelivery | null {
  if (rule.metric !== 'expense' || rule.condition !== 'threshold') {
    return null;
  }

  if (rule.scope.kind === 'merchant') {
    return 'everyPayment';
  }

  return rule.scope.kind === 'all' || rule.scope.kind === 'category' ? 'crossing' : null;
}
