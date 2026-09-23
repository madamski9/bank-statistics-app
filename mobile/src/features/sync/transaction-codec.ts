import type { api } from '@bankstats/convex/convex/_generated/api';
import type { IngestionRecord } from '@bankstats/ingestion-native';
import type { FunctionArgs, FunctionReturnType } from 'convex/server';

import { generalManualAccountId } from '@/features/financial-accounts/financial-account';

import { withoutUndefined, type SyncCodec } from './sync-plan';

export type PushedTransaction = FunctionArgs<typeof api.transactions.push>['changes'][number];

export type TransactionChange = Omit<PushedTransaction, 'revision' | 'deleted'>;

export type RemoteTransaction = FunctionReturnType<typeof api.transactions.list>[number];

export function changeFromRecord(record: IngestionRecord): TransactionChange {
  return withoutUndefined({
    clientId: record.id,
    bank: record.bank,
    origin: record.origin === 'manual' ? 'manual' : 'capture',
    direction: record.direction,
    transactionType: record.transactionType,
    amountMinor: record.amountMinor,
    currency: record.currency,
    merchant: record.merchant,
    category: record.category,
    sourceApp: record.sourceApp,
    review: record.review,
    accountId:
      record.origin === 'manual'
        ? (record.accountId ?? generalManualAccountId)
        : record.accountId,
    accountName: record.accountName,
    occurredAt: record.occurredAt,
    capturedAt: record.capturedAt,
    status: record.status,
  });
}

function recordFromChange(change: TransactionChange): IngestionRecord {
  return withoutUndefined({
    id: change.clientId,
    bank: change.bank === 'millennium' ? 'millennium' : 'manual',
    direction: change.direction,
    transactionType: change.transactionType,
    amountMinor: change.amountMinor,
    currency: change.currency,
    merchant: change.merchant,
    category: change.category,
    review: change.review,
    accountId: change.accountId,
    accountName: change.accountName,
    occurredAt: change.occurredAt,
    capturedAt: change.capturedAt,
    sourceApp:
      change.sourceApp ??
      (change.origin === 'capture' ? 'pl.millenniumbank.bankmillennium' : 'manual'),
    status: change.status,
    origin: change.origin,
  });
}

export const transactionCodec: SyncCodec<IngestionRecord, TransactionChange> = {
  includes: (record) =>
    record.origin === 'manual' ||
    (record.bank === 'millennium' && record.merchant !== 'SKLEP TEST'),
  idOf: (record) => record.id,
  toChange: changeFromRecord,
  fromChange: recordFromChange,
};
