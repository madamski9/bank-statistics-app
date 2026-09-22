import type { IngestionRecord } from '@bankstats/ingestion-native';

import type { CategorizationRule } from '@/features/classification/categorization-rule';

import { alertsToRaise } from './alert-delivery';
import { alertProgress } from './alert-evaluation';
import { alertMessage, type AlertMessage } from './alert-message';
import type { AlertRule } from './alert-rule';

export interface AlertNotifier {
  ensurePermission: () => Promise<boolean>;
  present: (message: AlertMessage) => Promise<void>;
}

export interface AlertRunContext {
  reference: Date;
  rules: CategorizationRule[];
  sent: string[];
  notifier: AlertNotifier;
}

export async function runAlerts(
  alertRules: AlertRule[],
  records: IngestionRecord[],
  { reference, rules, sent, notifier }: AlertRunContext,
): Promise<string[]> {
  const pending = alertRules
    .filter((rule) => rule.isActive)
    .flatMap((rule) => {
      const progress = alertProgress(rule, records, { reference, rules });

      return alertsToRaise(rule, progress, sent, reference).map((alert) => ({ rule, alert }));
    });

  if (pending.length === 0) {
    return sent;
  }

  if (!(await notifier.ensurePermission())) {
    return sent;
  }

  const delivered: string[] = [];

  for (const { rule, alert } of pending) {
    try {
      await notifier.present(alertMessage(rule, alert));
      delivered.push(alert.key);
    } catch {
      continue;
    }
  }

  return [...sent, ...delivered];
}
