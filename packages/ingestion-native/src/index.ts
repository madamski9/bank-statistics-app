import { requireOptionalNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

export type IngestionRecordSource = 'millennium' | 'manual';

export type IngestionRecordOrigin = 'capture' | 'manual';

export type IngestionRecordStatus = 'pending' | 'posted' | 'reversed';

export type IngestionReviewReason = 'amount' | 'currency' | 'direction' | 'merchant';

export interface IngestionRecord {
  id: string;
  bank: IngestionRecordSource;
  direction: 'expense' | 'income';
  transactionType?: 'cardPayment' | 'outgoingTransfer' | 'incomingTransfer';
  amountMinor: number;
  currency: string;
  merchant?: string;
  accountId?: string;
  accountName?: string;
  category?: string;
  occurredAt: string;
  capturedAt: string;
  sourceApp: string;
  status: IngestionRecordStatus;
  origin?: IngestionRecordOrigin;
  review?: IngestionReviewReason;
}

export interface StorageDiagnostics {
  cipherVersion: string;
  databasePath: string;
  /** ISO 8601 timestamp of the last time a background App Intent ran, in any outcome. */
  lastAttemptAt?: string;
  /**
   * 'ignored' means a notification was recognized but deliberately not saved — e.g. Millennium's
   * own card-payment push, deferred to the matching Apple Pay Wallet transaction.
   */
  lastAttemptOutcome?: 'success' | 'ignored' | 'failure';
  /** A coarse, non-sensitive failure/ignore code (e.g. "cardPaymentAwaitingApplePay"). Never raw text. */
  lastAttemptFailureReason?: string;
}

interface BankStatsIngestionNativeModule {
  ingestSynthetic(): Promise<IngestionRecord>;
  ingestSyntheticApplePayTransaction(): Promise<IngestionRecord>;
  deleteSyntheticRecords?(): Promise<number>;
  clearRecords?(): Promise<void>;
  saveRecord?(record: IngestionRecord): Promise<IngestionRecord>;
  deleteRecord?(id: string): Promise<number>;
  listRecords(): Promise<IngestionRecord[]>;
  storageDiagnostics(): Promise<StorageDiagnostics>;
}

const nativeModule = requireOptionalNativeModule<BankStatsIngestionNativeModule>(
  'BankStatsIngestion',
);

function requireIosModule(): BankStatsIngestionNativeModule {
  if (Platform.OS !== 'ios' || nativeModule === null) {
    throw new Error('BankStats notification ingestion requires an iOS development build');
  }

  return nativeModule;
}

export function ingestSyntheticMillenniumNotification(): Promise<IngestionRecord> {
  return requireIosModule().ingestSynthetic();
}

export function ingestSyntheticApplePayTransaction(): Promise<IngestionRecord> {
  return requireIosModule().ingestSyntheticApplePayTransaction();
}

export function clearIngestionRecords(): Promise<void> {
  const module = requireIosModule();

  if (typeof module.clearRecords !== 'function') {
    return Promise.reject(
      new Error('Clearing the outbox requires a development build that includes clearRecords'),
    );
  }

  return module.clearRecords();
}

export const syntheticSampleMerchant = 'SKLEP TEST';

export function isSyntheticIngestionRecord(record: IngestionRecord): boolean {
  return record.merchant === syntheticSampleMerchant && record.origin !== 'manual';
}

export function deleteSyntheticIngestionRecords(): Promise<number> {
  const module = requireIosModule();

  if (typeof module.deleteSyntheticRecords !== 'function') {
    return Promise.resolve(0);
  }

  return module.deleteSyntheticRecords();
}

export function saveIngestionRecord(record: IngestionRecord): Promise<IngestionRecord> {
  const module = requireIosModule();

  if (typeof module.saveRecord !== 'function') {
    return Promise.reject(
      new Error('Saving a transaction requires a development build that includes saveRecord'),
    );
  }

  return module.saveRecord(record);
}

export function deleteIngestionRecord(id: string): Promise<number> {
  const module = requireIosModule();

  if (typeof module.deleteRecord !== 'function') {
    return Promise.reject(
      new Error('Deleting a transaction requires a development build that includes deleteRecord'),
    );
  }

  return module.deleteRecord(id);
}

export function listIngestionRecords(): Promise<IngestionRecord[]> {
  return requireIosModule().listRecords();
}

export function getIngestionStorageDiagnostics(): Promise<StorageDiagnostics> {
  return requireIosModule().storageDiagnostics();
}
