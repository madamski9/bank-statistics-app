import type { api } from '@bankstats/convex/convex/_generated/api';
import type { IngestionRecord } from '@bankstats/ingestion-native';
import type { FunctionArgs, FunctionReturnType } from 'convex/server';

import { generalManualAccountId } from '@/features/financial-accounts/financial-account';

import { withoutUndefined, type SyncCodec } from './sync-plan';

const captureSourceApps = {
  millennium: 'pl.millenniumbank.bankmillennium',
  pko: 'pl.pkobp.iko',
} as const;

function isCaptureBank(bank: string): bank is keyof typeof captureSourceApps {
  return bank === 'millennium' || bank === 'pko';
}

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
    eventId: record.eventId,
    reportingAmountMinor: record.reportingAmountMinor,
    exchangeRate: record.exchangeRate,
    exchangeRateDate: record.exchangeRateDate,
    exchangeRateTable: record.exchangeRateTable,
  });
}

function recordFromChange(change: TransactionChange): IngestionRecord {
  return withoutUndefined({
    id: change.clientId,
    bank: isCaptureBank(change.bank) ? change.bank : 'manual',
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
      (change.origin === 'capture' && isCaptureBank(change.bank)
        ? captureSourceApps[change.bank]
        : 'manual'),
    status: change.status,
    origin: change.origin,
    eventId: change.eventId,
    reportingAmountMinor: change.reportingAmountMinor,
    exchangeRate: change.exchangeRate,
    exchangeRateDate: change.exchangeRateDate,
    exchangeRateTable: change.exchangeRateTable,
  });
}

export const transactionCodec: SyncCodec<IngestionRecord, TransactionChange> = {
  includes: (record) =>
    record.origin === 'manual' ||
    (isCaptureBank(record.bank) && record.merchant !== 'SKLEP TEST'),
  idOf: (record) => record.id,
  toChange: changeFromRecord,
  fromChange: recordFromChange,
};
