import rules from '../rules/bank-notification-rules.json';

import { BankNotificationInterpreter } from './bank-notification-interpreter';
import type { RuleBundle } from './rule-bundle';

export interface DiagnosticNotification {
  title: string;
  subtitle: string;
  body: string;
  sourceApp: string;
}

export const diagnosticSampleTextLimit = 8000;
export const diagnosticSampleTotalLimit = 12000;
export const diagnosticSampleCaptureTime = '2026-01-15T12:00:00Z';

const directIdentifier =
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|\b(?:PL\s*)?\d{2}(?:[\s-]*\d){24}\b|(?:\+48[\s-]*)?\b\d{3}[\s-]*\d{3}[\s-]*\d{3}\b/iu;
const sourceAppPattern = /^[a-zA-Z0-9._-]{1,200}$/u;
const interpreter = new BankNotificationInterpreter(rules as RuleBundle);

export function diagnosticSampleProblem(
  notification: DiagnosticNotification,
): 'empty' | 'tooLong' | 'identifiers' | 'sourceApp' | null {
  const texts = [notification.title, notification.subtitle, notification.body];
  if (texts.every((text) => text.trim() === '')) {
    return 'empty';
  }
  if (
    texts.some((text) => text.length > diagnosticSampleTextLimit) ||
    texts.join('').length > diagnosticSampleTotalLimit
  ) {
    return 'tooLong';
  }
  if (texts.some((text) => directIdentifier.test(text))) {
    return 'identifiers';
  }
  return sourceAppPattern.test(notification.sourceApp) ? null : 'sourceApp';
}

export function diagnosticSamplePreview(notification: DiagnosticNotification) {
  const result = interpreter.normalize({
    ...notification,
    capturedAt: new Date(diagnosticSampleCaptureTime),
  });
  return { parserVersion: interpreter.version, result };
}
