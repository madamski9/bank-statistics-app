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
  missedCaptures?: AlertPause;
}

export interface AlertPause {
  sinceMs: number;
  untilMs: number;
}

interface PendingAlert {
  message: AlertMessage;
  keys: string[];
}

const recentPaymentMs = 86_400_000;

export function paymentSentKey(ruleId: string, recordId: string): string {
  return JSON.stringify(['payment', ruleId, recordId]);
}

function isMissedCapture(capturedMs: number, missedCaptures: AlertPause | undefined): boolean {
  return missedCaptures !== undefined && capturedMs >= missedCaptures.sinceMs && capturedMs < missedCaptures.untilMs;
}

function capturedOrder(left: IngestionRecord, right: IngestionRecord): number {
  const byTime = new Date(left.capturedAt).getTime() - new Date(right.capturedAt).getTime();

  return Number.isNaN(byTime) || byTime === 0 ? left.id.localeCompare(right.id) : byTime;
}

function isMissedCaptureRecord(record: IngestionRecord, missedCaptures: AlertPause | undefined): boolean {
  return record.origin !== 'manual' && isMissedCapture(new Date(record.capturedAt).getTime(), missedCaptures);
}

function ledgerWhenCaptured(
  record: IngestionRecord,
  records: IngestionRecord[],
  missedCaptures: AlertPause | undefined,
): IngestionRecord[] {
  if (!isMissedCaptureRecord(record, missedCaptures)) {
    return records;
  }

  return records.filter(
    (candidate) => !isMissedCaptureRecord(candidate, missedCaptures) || capturedOrder(candidate, record) <= 0,
  );
}

function isFreshUnannouncedPayment(
  record: IngestionRecord,
  rule: AlertRule,
  { reference, missedCaptures }: AlertRunContext,
): boolean {
  const capturedMs = new Date(record.capturedAt).getTime();

  return (
    !Number.isNaN(capturedMs) &&
    (record.origin === 'manual' || isMissedCapture(capturedMs, missedCaptures)) &&
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
  context: AlertRunContext,
): PendingAlert[] {
  const { reference, rules, sent, hasAggressiveTone, missedCaptures } = context;

  return [...records].sort(capturedOrder).flatMap((record) => {
    const key = paymentSentKey(rule.id, record.id);

    if (sent.includes(key) || !isFreshUnannouncedPayment(record, rule, context)) {
      return [];
    }

    const message = paymentAlertMessage(rule, record, ledgerWhenCaptured(record, records, missedCaptures), {
      reference,
      rules,
      hasAggressiveTone,
    });

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
