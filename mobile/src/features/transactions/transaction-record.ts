import type { IngestionRecord, IngestionReviewReason } from '@bankstats/ingestion-native';

import type { SpendingSourceKind } from '@/features/spending-overview/spending-summary';

export type TransactionBadgeTone = 'caution' | 'neutral';

export interface TransactionBadge {
  label: string;
  tone: TransactionBadgeTone;
}

const blockingReviewReasons: IngestionReviewReason[] = ['amount', 'currency', 'direction'];

const bankLabels: Record<IngestionRecord['bank'], string> = {
  millennium: 'Millennium',
  manual: 'Wpis ręczny',
};

const typeLabels: Record<SpendingSourceKind, string> = {
  cardPayment: 'Płatność kartą',
  outgoingTransfer: 'Przelew wychodzący',
  incomingTransfer: 'Przelew przychodzący',
  other: 'Inna transakcja',
};

const reviewPrompts: Record<IngestionReviewReason, string> = {
  amount: 'Nie mamy pewności co do kwoty. Potwierdź ją, żeby transakcja trafiła do statystyk.',
  currency: 'Nie rozpoznaliśmy waluty. Potwierdź ją, żeby transakcja trafiła do statystyk.',
  direction:
    'Nie wiemy, czy to wydatek, czy przychód. Potwierdź kierunek, żeby transakcja trafiła do statystyk.',
  merchant:
    'Nie rozpoznaliśmy nazwy. Transakcja liczy się do przepływów, a nazwę możesz uzupełnić tutaj.',
};

export function isReviewItem(record: IngestionRecord): boolean {
  return record.review !== undefined;
}

export function blocksStatistics(record: IngestionRecord): boolean {
  return record.review !== undefined && blockingReviewReasons.includes(record.review);
}

export function affectsStatistics(record: IngestionRecord): boolean {
  return !blocksStatistics(record) && record.status !== 'reversed';
}

export function isManualTransaction(record: IngestionRecord): boolean {
  return record.origin === 'manual';
}

export function transactionKind(record: IngestionRecord): SpendingSourceKind {
  return record.transactionType ?? 'other';
}

export function transactionTitle(record: IngestionRecord): string {
  return record.merchant ?? record.category ?? typeLabels[transactionKind(record)];
}

export function transactionContext(record: IngestionRecord): string {
  const bank = bankLabels[record.bank];

  return record.accountName === undefined ? bank : `${bank} · ${record.accountName}`;
}

export function transactionBadge(record: IngestionRecord): TransactionBadge | null {
  if (isReviewItem(record)) {
    return { label: 'Do sprawdzenia', tone: 'caution' };
  }

  if (record.status === 'reversed') {
    return { label: 'Cofnięta', tone: 'neutral' };
  }

  return null;
}

export function reviewPrompt(reason: IngestionReviewReason): string {
  return reviewPrompts[reason];
}
