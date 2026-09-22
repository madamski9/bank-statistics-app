import type { IngestionRecord } from '@bankstats/ingestion-native';

import type { CategorizationRule } from '@/features/classification/categorization-rule';
import { classifyTransaction } from '@/features/classification/classify-transaction';
import { affectsStatistics } from '@/features/transactions/transaction-record';

import { alertWindow, type AlertWindow } from './alert-period';
import type { AlertRule, AlertScope } from './alert-rule';

export interface EvaluationContext {
  reference: Date;
  rules: CategorizationRule[];
}

export interface AlertProgress {
  amountMinor: number;
  targetMinor: number;
  share: number;
  window: AlertWindow;
  currency: string;
}

function occurredMs(record: IngestionRecord): number {
  return new Date(record.occurredAt).getTime();
}

function isWithin(record: IngestionRecord, window: AlertWindow): boolean {
  const occurred = occurredMs(record);

  return !Number.isNaN(occurred) && occurred >= window.startMs && occurred < window.endMs;
}

function matchesScope(
  record: IngestionRecord,
  scope: AlertScope,
  rules: CategorizationRule[],
): boolean {
  if (scope.kind === 'all') {
    return true;
  }

  const classified = classifyTransaction(record, rules);

  if (scope.kind === 'merchant') {
    return classified.merchantKey === scope.key;
  }

  if (scope.kind === 'counterparty') {
    return (
      classified.counterpartyName?.toLocaleLowerCase('pl') === scope.name.toLocaleLowerCase('pl')
    );
  }

  return classified.category === scope.id;
}

export function alertProgress(
  rule: AlertRule,
  records: IngestionRecord[],
  { reference, rules }: EvaluationContext,
): AlertProgress {
  const window = alertWindow(rule.period, reference);
  const counted = records.filter(
    (record) =>
      affectsStatistics(record) && isWithin(record, window) && matchesScope(record, rule.scope, rules),
  );

  const sumOf = (direction: IngestionRecord['direction']) =>
    counted
      .filter((record) => record.direction === direction)
      .reduce((sum, record) => sum + record.amountMinor, 0);

  const expenseMinor = sumOf('expense');
  const incomeMinor = sumOf('income');
  const amountMinor =
    rule.metric === 'expense'
      ? expenseMinor
      : rule.metric === 'income'
        ? incomeMinor
        : incomeMinor - expenseMinor;

  return {
    amountMinor,
    targetMinor: rule.targetMinor,
    share: rule.targetMinor === 0 ? 0 : amountMinor / rule.targetMinor,
    window,
    currency: counted[0]?.currency ?? 'PLN',
  };
}
