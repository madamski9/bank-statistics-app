import type { IngestionRecord } from '@bankstats/ingestion-native';

import type { CategorizationRule } from '@/features/data/classification/categorization-rule';

import { alertsToRaise, sentKey } from './alert-delivery';
import { alertProgress } from '../evaluation/alert-evaluation';
import { alertMessage, type AlertMessage } from './alert-message';
import { paymentAlertMessage } from './payment-alert';
import { toneDelivery, type AlertRule } from '../rules/alert-rule';

export interface AlertNotifier {
  ensurePermission: () => Promise<boolean>;
  present: (message: AlertMessage) => Promise<void>;
}

export interface AlertRunContext {
  reference: Date;
  rules: CategorizationRule[];
  sent: string[];
  notifier: AlertNotifier;
  hasAggressiveTone?: boolean;
}

interface PendingAlert {
  message: AlertMessage;
  keys: string[];
}

const recentPaymentMs = 86_400_000;

export function paymentSentKey(ruleId: string, recordId: string): string {
  return JSON.stringify(['payment', ruleId, recordId]);
}

function isFreshManualPayment(record: IngestionRecord, rule: AlertRule, reference: Date): boolean {
  const capturedMs = new Date(record.capturedAt).getTime();

  return (
    record.origin === 'manual' &&
    !Number.isNaN(capturedMs) &&
    capturedMs >= new Date(rule.createdAt).getTime() &&
    reference.getTime() - capturedMs <= recentPaymentMs
  );
}

function thresholdAlerts(
  rule: AlertRule,
  records: IngestionRecord[],
  { reference, rules, sent }: AlertRunContext,
): PendingAlert[] {
  const progress = alertProgress(rule, records, { reference, rules });

  return alertsToRaise(rule, progress, sent, reference).map((alert) => ({
    message: alertMessage(rule, alert),
    keys: [
      alert.key,
      ...(rule.condition === 'threshold'
        ? rule.thresholdShares
            .filter((share) => share < alert.share)
            .map((share) => sentKey(rule, alert.periodKey, share))
        : []),
    ],
  }));
}

function paymentAlerts(
  rule: AlertRule,
  records: IngestionRecord[],
  { reference, rules, sent, hasAggressiveTone }: AlertRunContext,
): PendingAlert[] {
  return records.flatMap((record) => {
    const key = paymentSentKey(rule.id, record.id);

    if (sent.includes(key) || !isFreshManualPayment(record, rule, reference)) {
      return [];
    }

    const message = paymentAlertMessage(rule, record, records, { reference, rules, hasAggressiveTone });

    return message === null ? [] : [{ message, keys: [key] }];
  });
}

export async function runAlerts(
  alertRules: AlertRule[],
  records: IngestionRecord[],
  context: AlertRunContext,
): Promise<string[]> {
  const { sent, notifier } = context;
  const pending = alertRules
    .filter((rule) => rule.isActive)
    .flatMap((rule) =>
      toneDelivery(rule) === null ? thresholdAlerts(rule, records, context) : paymentAlerts(rule, records, context),
    );

  if (pending.length === 0) {
    return sent;
  }

  if (!(await notifier.ensurePermission())) {
    return sent;
  }

  const delivered: string[] = [];

  for (const { message, keys } of pending) {
    try {
      await notifier.present(message);
      delivered.push(...keys);
    } catch {
      continue;
    }
  }

  return [...sent, ...delivered];
}
