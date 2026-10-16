import type { IngestionRecord } from '@bankstats/ingestion-native';

import type { CategorizationRule } from '@/features/data/classification/categorization-rule';
import { uncategorizedCategory } from '@/features/data/classification/categories';
import { classifyTransaction } from '@/features/data/classification/classify-transaction';
import { affectsStatistics } from '@/features/home/transactions/record/transaction-record';

import { alertWindow, previousAlertWindow, type AlertWindow } from './alert-period';
import type { AlertRule, AlertScope } from '../rules/alert-rule';

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

export function matchesScope(
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

  return scope.id === uncategorizedCategory
    ? classified.isUncategorized
    : classified.category === scope.id;
}

export const reportingCurrency = 'PLN';

export function alertProgress(
  rule: AlertRule,
  records: IngestionRecord[],
  { reference, rules }: EvaluationContext,
): AlertProgress {
  const window =
    rule.condition === 'missingIncome'
      ? previousAlertWindow(rule.period, reference)
      : alertWindow(rule.period, reference);
  const counted = records.filter(
    (record) =>
      record.currency === reportingCurrency &&
      affectsStatistics(record) &&
      isWithin(record, window) &&
      occurredMs(record) <= reference.getTime() &&
      matchesScope(record, rule.scope, rules),
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
    currency: reportingCurrency,
  };
}
