import type { IngestionRecord, NotificationDiagnostic } from '@bankstats/ingestion-native';
import type { DiagnosticNotification } from '@bankstats/parser-rules';

import {
  draftFromRecord,
  emptyDraft,
  type TransactionDraft,
} from '@/features/home/transactions/transaction-editor/manual-transaction';

export interface ParsingAttempt {
  ruleId: string;
  reasonCode: string;
  groups: Record<string, string>;
}

export interface DiagnosticDetails {
  failureReason?: string;
  parser?: {
    parserVersion: number;
    reasonCode?: string;
    attempts: ParsingAttempt[];
    record?: IngestionRecord;
  };
}

function object(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function diagnosticDetails(notification: NotificationDiagnostic): DiagnosticDetails {
  try {
    const value = object(JSON.parse(notification.diagnosticJson ?? '{}'));
    if (value === null) return {};
    const details: DiagnosticDetails = {};
    if (typeof value.failureReason === 'string') details.failureReason = value.failureReason;
    const parser = object(value.parser);
    if (parser === null || typeof parser.parserVersion !== 'number') return details;
    const attempts: ParsingAttempt[] = [];
    for (const candidate of Array.isArray(parser.attempts) ? parser.attempts : []) {
      const attempt = object(candidate);
      if (
        attempt === null ||
        typeof attempt.ruleId !== 'string' ||
        typeof attempt.reasonCode !== 'string'
      )
        continue;
      const groups = Object.fromEntries(
        Object.entries(object(attempt.groups) ?? {}).filter(
          (entry): entry is [string, string] => typeof entry[1] === 'string',
        ),
      );
      attempts.push({ ruleId: attempt.ruleId, reasonCode: attempt.reasonCode, groups });
    }
    details.parser = {
      parserVersion: parser.parserVersion,
      reasonCode: typeof parser.reasonCode === 'string' ? parser.reasonCode : undefined,
      attempts,
    };
    const record = object(parser.record);
    if (
      record !== null &&
      typeof record.id === 'string' &&
      typeof record.amountMinor === 'number' &&
      typeof record.currency === 'string' &&
      typeof record.occurredAt === 'string' &&
      typeof record.capturedAt === 'string' &&
      (record.direction === 'expense' || record.direction === 'income')
    ) {
      details.parser.record = record as unknown as IngestionRecord;
    }
    return details;
  } catch {
    return {};
  }
}

export function diagnosticReason(notification: NotificationDiagnostic): string {
  const details = diagnosticDetails(notification);
  if (details.failureReason != null) {
    return details.failureReason;
  }
  const invalid = details.parser?.attempts?.find((attempt) =>
    ['invalidAmount', 'invalidOccurrenceDate', 'invalidRecord'].includes(attempt.reasonCode),
  );
  return (
    invalid?.reasonCode ??
    (details.parser?.reasonCode === 'notTransaction'
      ? 'noMatchingRule'
      : (details.parser?.reasonCode ?? 'notAttempted'))
  );
}

function extracted(notification: NotificationDiagnostic): Record<string, string> {
  const attempts = diagnosticDetails(notification).parser?.attempts ?? [];
  return attempts.reduce<Record<string, string>>(
    (fields, attempt) => ({ ...fields, ...attempt.groups }),
    {},
  );
}

export function recoveryDraft(notification: NotificationDiagnostic): TransactionDraft {
  const draft = emptyDraft(new Date(notification.capturedAt));
  const parsed = diagnosticDetails(notification).parser?.record;
  if (parsed !== undefined && parsed !== null) {
    return { ...draftFromRecord(parsed), accountId: draft.accountId };
  }
  const fields = extracted(notification);
  return {
    ...draft,
    kind: 'other',
    amount: fields.amount ?? '',
    currency: /^[A-Z]{3}$/u.test(fields.currency ?? '') ? fields.currency : 'PLN',
    name: fields.merchant ?? fields.party ?? notification.subtitle,
  };
}

function escapePattern(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

export function redactedSample(notification: NotificationDiagnostic): DiagnosticNotification {
  const fields = extracted(notification);
  const replacements = [
    [fields.party, 'OSOBA TESTOWA'],
    [fields.merchant, 'SKLEP TESTOWY'],
    [fields.account, 'KONTO TESTOWE'],
  ];
  const redact = (value: string) => {
    let next = value;
    for (const [original, replacement] of replacements) {
      if (original !== undefined && original !== '' && replacement !== undefined) {
        next = next.replace(new RegExp(escapePattern(original), 'giu'), replacement);
      }
    }
    return next
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/giu, '[EMAIL]')
      .replace(/\b(?:PL\s*)?\d{2}(?:[\s-]*\d){24}\b/gu, '[RACHUNEK]')
      .replace(/(?:\+48[\s-]*)?\b\d{3}[\s-]*\d{3}[\s-]*\d{3}\b/gu, '[TELEFON]');
  };
  return {
    title: redact(notification.title),
    subtitle: notification.subtitle.trim() === '' ? '' : 'SKLEP TESTOWY',
    body: redact(notification.body),
    sourceApp: /^[a-zA-Z0-9._-]{1,200}$/u.test(notification.sourceApp)
      ? notification.sourceApp
      : 'unknown',
  };
}

export function diagnosticJson(notification: NotificationDiagnostic): string {
  return JSON.stringify(
    {
      notification: {
        title: notification.title,
        subtitle: notification.subtitle,
        body: notification.body,
        sourceApp: notification.sourceApp,
        capturedAt: notification.capturedAt,
      },
      diagnostic: diagnosticDetails(notification),
    },
    null,
    2,
  );
}
