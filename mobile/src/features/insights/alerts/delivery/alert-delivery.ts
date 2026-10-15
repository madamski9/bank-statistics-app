import type { AlertProgress } from '../evaluation/alert-evaluation';
import type { AlertRule } from '../rules/alert-rule';

export interface RaisedAlert {
  key: string;
  ruleId: string;
  share: number;
  amountMinor: number;
  targetMinor: number;
  currency: string;
  periodKey: string;
}

export function sentKey(rule: AlertRule, periodKey: string, share: number): string {
  return JSON.stringify([
    rule.id,
    periodKey,
    rule.metric,
    rule.scope,
    rule.condition,
    rule.targetMinor,
    share,
  ]);
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
    key: sentKey(rule, progress.window.key, share),
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

  const pending = rule.thresholdShares
    .filter((share) => progress.amountMinor >= Math.round(rule.targetMinor * share))
    .map(raise)
    .filter((alert) => !sent.includes(alert.key));

  return pending.length === 0
    ? []
    : [pending.reduce((highest, alert) => (alert.share > highest.share ? alert : highest))];
}
