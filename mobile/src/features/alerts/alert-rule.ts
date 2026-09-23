import type { AlertPeriod } from './alert-period';

export type AlertMetric = 'expense' | 'income' | 'netFlow';

export type AlertScope =
  | { kind: 'all' }
  | { kind: 'merchant'; key: string; name: string }
  | { kind: 'counterparty'; name: string }
  | { kind: 'category'; id: string };

export type AlertCondition = 'threshold' | 'missingIncome';

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
}
