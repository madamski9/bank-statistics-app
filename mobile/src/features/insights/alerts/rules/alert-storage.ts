import type { AlertPeriod } from '../evaluation/alert-period';
import type { AlertRule, AlertScope } from './alert-rule';

function isScope(value: unknown): value is AlertScope {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const scope = value as { kind?: unknown; key?: unknown; name?: unknown; id?: unknown };

  if (scope.kind === 'all') {
    return true;
  }

  if (scope.kind === 'merchant') {
    return typeof scope.key === 'string' && typeof scope.name === 'string';
  }

  if (scope.kind === 'counterparty') {
    return typeof scope.name === 'string';
  }

  return scope.kind === 'category' && typeof scope.id === 'string';
}

function isPeriod(value: unknown): value is AlertPeriod {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const period = value as { kind?: unknown; startMs?: unknown; endMs?: unknown };

  if (period.kind === 'week' || period.kind === 'month' || period.kind === 'year') {
    return true;
  }

  return (
    period.kind === 'custom' &&
    typeof period.startMs === 'number' &&
    typeof period.endMs === 'number'
  );
}

function isAlertRule(value: unknown): value is AlertRule {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const rule = value as Partial<AlertRule>;

  return (
    typeof rule.id === 'string' &&
    (rule.metric === 'expense' || rule.metric === 'income' || rule.metric === 'netFlow') &&
    isScope(rule.scope) &&
    isPeriod(rule.period) &&
    (rule.condition === 'threshold' || rule.condition === 'missingIncome') &&
    typeof rule.targetMinor === 'number' &&
    Array.isArray(rule.thresholdShares) &&
    rule.thresholdShares.every((share) => typeof share === 'number') &&
    typeof rule.isActive === 'boolean' &&
    typeof rule.createdAt === 'string'
  );
}

function parseArray<Item>(stored: string | null, guard: (value: unknown) => value is Item): Item[] {
  if (stored === null) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(stored);

    return Array.isArray(parsed) && parsed.every(guard) ? parsed : [];
  } catch {
    return [];
  }
}

export function parseAlertRules(stored: string | null): AlertRule[] {
  return parseArray(stored, isAlertRule);
}

export function parseSentAlerts(stored: string | null): string[] {
  return parseArray(stored, (value): value is string => typeof value === 'string');
}

export interface AlertStorage {
  read: (key: 'rules' | 'ledger') => Promise<string | null>;
  write: (key: 'rules' | 'ledger', value: string) => Promise<void>;
}

export async function readAlertRules(storage: AlertStorage): Promise<AlertRule[]> {
  try {
    return parseAlertRules(await storage.read('rules'));
  } catch {
    return [];
  }
}

export async function writeAlertRules(
  storage: AlertStorage,
  rules: AlertRule[],
): Promise<void> {
  await storage.write('rules', JSON.stringify(rules));
}

export async function readSentAlerts(storage: AlertStorage): Promise<string[]> {
  try {
    return parseSentAlerts(await storage.read('ledger'));
  } catch {
    return [];
  }
}

export async function writeSentAlerts(storage: AlertStorage, sent: string[]): Promise<void> {
  await storage.write('ledger', JSON.stringify(sent));
}
