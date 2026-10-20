import rules from '../rules/bank-notification-rules.json';

import type { RuleBundle } from './rule-bundle';

export {
  BankNotificationInterpreter,
  collapseWhitespace,
  isoTimestamp,
  minorUnits,
  type BankNotification,
  type NormalizationOutcome,
  type NormalizedNotification,
} from './bank-notification-interpreter';
export type { RuleBundle } from './rule-bundle';

export const bundledRules = rules as RuleBundle;

export {
  diagnosticSampleProblem,
  diagnosticSamplePreview,
  diagnosticSampleTextLimit,
  type DiagnosticNotification,
} from './diagnostic-sample';
