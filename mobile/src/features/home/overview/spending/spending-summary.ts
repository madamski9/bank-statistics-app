import type { IngestionRecord } from '@bankstats/ingestion-native';

import type { CategorizationRule } from '@/features/data/classification/categorization-rule';
import { classifyTransaction } from '@/features/data/classification/classify-transaction';
import { currentCopy } from '@/features/app-shell/localization/language';
import {
  partyGroupReference,
  type PartyGroupReference,
} from '@/features/data/classification/spending-groups';

import { isWithinWindow, windowDays, type PeriodWindow } from '../period/periods';
import { spendingOverviewCopy } from '../spending-overview-copy';

export type SpendingSourceKind = NonNullable<IngestionRecord['transactionType']> | 'other';

export interface SpendingSource {
  key: string;
  label: string;
  kind: SpendingSourceKind;
  amountMinor: number;
  share: number;
  count: number;
  group: PartyGroupReference | null;
}

export interface SpendingSummary {
  currency: string;
  expenseMinor: number;
  incomeMinor: number;
  /** Income minus expenses for the selected period. Never an account balance. */
  netMinor: number;
  expenseCount: number;
  incomeCount: number;
  dailyExpenseMinor: number;
  largestExpense: SpendingSource | null;
  sources: SpendingSource[];
  incomeSources: SpendingSource[];
  accounts: string[];
  skippedCurrencies: string[];
}

const maximumSources = 6;

function dominantCurrency(records: IngestionRecord[]): string {
  const countsByCurrency = new Map<string, number>();

  for (const record of records) {
    countsByCurrency.set(record.currency, (countsByCurrency.get(record.currency) ?? 0) + 1);
  }

  let dominant = 'PLN';
  let highestCount = 0;

  for (const [currency, count] of countsByCurrency) {
    if (count > highestCount) {
      dominant = currency;
      highestCount = count;
    }
  }

  return dominant;
}

function sourceKind(record: IngestionRecord): SpendingSourceKind {
  return record.transactionType ?? 'other';
}

function sourceParty(
  record: IngestionRecord,
  rules: CategorizationRule[],
): { name: string | null; group: PartyGroupReference | null } {
  const classified = classifyTransaction(record, rules);

  return {
    name: classified.merchantName ?? classified.counterpartyName ?? null,
    group: partyGroupReference(classified),
  };
}

function accountLabel(record: IngestionRecord): string {
  const copy = currentCopy(spendingOverviewCopy);

  return `${copy.banks[record.bank]} · ${record.accountName ?? copy.mainAccount}`;
}

function groupSources(
  records: IngestionRecord[],
  total: number,
  rules: CategorizationRule[],
): SpendingSource[] {
  const sourcesByKey = new Map<string, SpendingSource>();

  for (const record of records) {
    const { name, group } = sourceParty(record, rules);
    const key = name ?? sourceKind(record);
    const existing = sourcesByKey.get(key);

    if (existing === undefined) {
      sourcesByKey.set(key, {
        key,
        label: name ?? currentCopy(spendingOverviewCopy).sourceKinds[sourceKind(record)],
        kind: sourceKind(record),
        amountMinor: record.amountMinor,
        share: 0,
        count: 1,
        group: name === null ? null : group,
      });
      continue;
    }

    existing.amountMinor += record.amountMinor;
    existing.count += 1;
  }

  const ranked = [...sourcesByKey.values()].sort(
    (left, right) => right.amountMinor - left.amountMinor,
  );
  const sources = ranked.length > maximumSources ? ranked.slice(0, maximumSources - 1) : ranked;
  const remainder = ranked.slice(sources.length);

  if (remainder.length > 0) {
    sources.push({
      key: 'remainder',
      label: currentCopy(spendingOverviewCopy).remainder,
      kind: 'other',
      amountMinor: remainder.reduce((sum, source) => sum + source.amountMinor, 0),
      share: 0,
      count: remainder.reduce((sum, source) => sum + source.count, 0),
      group: null,
    });
  }

  for (const source of sources) {
    source.share = total === 0 ? 0 : source.amountMinor / total;
  }

  return sources;
}

function earliestTimestamp(records: IngestionRecord[]): number | null {
  let earliest: number | null = null;

  for (const record of records) {
    const occurredMs = new Date(record.occurredAt).getTime();

    if (!Number.isNaN(occurredMs) && (earliest === null || occurredMs < earliest)) {
      earliest = occurredMs;
    }
  }

  return earliest;
}

export function summarizeSpending(
  records: IngestionRecord[],
  window: PeriodWindow,
  rules: CategorizationRule[] = [],
): SpendingSummary {
  const withinPeriod = records.filter((record) => isWithinWindow(record.occurredAt, window));
  const currency = dominantCurrency(withinPeriod);
  const counted = withinPeriod.filter((record) => record.currency === currency);
  const skippedCurrencies = [
    ...new Set(
      withinPeriod.filter((record) => record.currency !== currency).map((record) => record.currency),
    ),
  ];
  const accounts = [...new Set(counted.map(accountLabel))];

  const expenses = counted.filter((record) => record.direction === 'expense');
  const incomes = counted.filter((record) => record.direction === 'income');
  const expenseMinor = expenses.reduce((sum, record) => sum + record.amountMinor, 0);
  const incomeMinor = incomes.reduce((sum, record) => sum + record.amountMinor, 0);
  const sources = groupSources(expenses, expenseMinor, rules);
  const days = windowDays(window, earliestTimestamp(records));

  return {
    currency,
    expenseMinor,
    incomeMinor,
    netMinor: incomeMinor - expenseMinor,
    expenseCount: expenses.length,
    incomeCount: incomes.length,
    dailyExpenseMinor: Math.round(expenseMinor / days),
    largestExpense: sources.find((source) => source.key !== 'remainder') ?? null,
    sources,
    incomeSources: groupSources(incomes, incomeMinor, rules),
    accounts,
    skippedCurrencies,
  };
}

/** Relative change against the previous period, or null when it cannot be expressed. */
export function periodChange(current: number, previous: number): number | null {
  if (previous === 0) {
    return null;
  }

  return (current - previous) / Math.abs(previous);
}
