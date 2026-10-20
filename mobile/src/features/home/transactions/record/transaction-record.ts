import type { IngestionRecord, IngestionReviewReason } from '@bankstats/ingestion-native';

import type { CategorizationRule } from '@/features/data/classification/categorization-rule';
import { classifyTransaction } from '@/features/data/classification/classify-transaction';
import { inReportingCurrency, needsConversion } from '@/features/data/currency-conversion/exchange-rate';
import type { SpendingSourceKind } from '@/features/home/overview/spending/spending-summary';
import { currentCopy } from '@/features/app-shell/localization/language';

import { transactionsCopy } from '../transactions-copy';

export type TransactionBadgeTone = 'caution' | 'neutral';

export interface TransactionBadge {
  label: string;
  tone: TransactionBadgeTone;
}

const blockingReviewReasons: IngestionReviewReason[] = ['amount', 'currency', 'direction'];

export function isReviewItem(record: IngestionRecord): boolean {
  return record.review !== undefined;
}

export function blocksStatistics(record: IngestionRecord): boolean {
  return record.review !== undefined && blockingReviewReasons.includes(record.review);
}

export function affectsStatistics(record: IngestionRecord): boolean {
  return !blocksStatistics(record) && record.status !== 'reversed';
}

export function statisticalRecords(records: IngestionRecord[]): IngestionRecord[] {
  return records.flatMap((record) => {
    if (!affectsStatistics(record)) {
      return [];
    }

    const converted = inReportingCurrency(record);

    return converted === null ? [] : [converted];
  });
}

export function awaitingConversionCount(records: IngestionRecord[]): number {
  return records.filter((record) => affectsStatistics(record) && needsConversion(record)).length;
}

export function isManualTransaction(record: IngestionRecord): boolean {
  return record.origin === 'manual';
}

export function transactionKind(record: IngestionRecord): SpendingSourceKind {
  return record.transactionType ?? 'other';
}

export function transactionTitle(record: IngestionRecord, rules: CategorizationRule[]): string {
  const classified = classifyTransaction(record, rules);

  if (classified.merchantName !== undefined) {
    return classified.merchantName;
  }

  if (classified.counterpartyName !== undefined) {
    return classified.counterpartyName;
  }

  return classified.isUncategorized
    ? currentCopy(transactionsCopy).types[transactionKind(record)]
    : classified.categoryName;
}

export function transactionKindLabel(record: IngestionRecord): string {
  return currentCopy(transactionsCopy).types[transactionKind(record)];
}

export function transactionContext(record: IngestionRecord): string {
  const bank = record.bank === 'unknown'
    ? record.bankName ?? [currentCopy(transactionsCopy).banks.unknown, record.notificationTitle?.trim()].filter(Boolean).join(' · ')
    : currentCopy(transactionsCopy).banks[record.bank];

  return record.accountName === undefined ? bank : `${bank} · ${record.accountName}`;
}

export function transactionBadge(record: IngestionRecord): TransactionBadge | null {
  if (isReviewItem(record)) {
    return { label: currentCopy(transactionsCopy).toReview, tone: 'caution' };
  }

  if (record.status === 'reversed') {
    return { label: currentCopy(transactionsCopy).reversed, tone: 'neutral' };
  }

  return null;
}

export function reviewPrompt(reason: IngestionReviewReason): string {
  return currentCopy(transactionsCopy).reviewPrompts[reason];
}
