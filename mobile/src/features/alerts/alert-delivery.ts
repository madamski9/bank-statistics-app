import type { AlertProgress } from './alert-evaluation';
import type { AlertRule } from './alert-rule';

export interface RaisedAlert {
  key: string;
  ruleId: string;
  share: number;
  amountMinor: number;
  targetMinor: number;
  currency: string;
  periodKey: string;
}

export function sentKey(ruleId: string, periodKey: string, share: number): string {
  return `${ruleId}|${periodKey}|${share}`;
}

export function alertsToRaise(
  rule: AlertRule,
  progress: AlertProgress,
  sent: string[],
  reference: Date,
): RaisedAlert[] {
  if (!rule.isActive) {
    return [];
  }

  const raise = (share: number): RaisedAlert => ({
    key: sentKey(rule.id, progress.window.key, share),
    ruleId: rule.id,
    share,
    amountMinor: progress.amountMinor,
    targetMinor: progress.targetMinor,
    currency: progress.currency,
    periodKey: progress.window.key,
  });

  if (rule.condition === 'missingIncome') {
    const hasClosed = reference.getTime() >= progress.window.endMs;

    if (!hasClosed || progress.amountMinor >= rule.targetMinor) {
      return [];
    }

    const alert = raise(1);

    return sent.includes(alert.key) ? [] : [alert];
  }

  return rule.thresholdShares
    .filter((share) => progress.amountMinor >= Math.round(rule.targetMinor * share))
    .map(raise)
    .filter((alert) => !sent.includes(alert.key));
}
