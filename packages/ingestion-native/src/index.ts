import { requireOptionalNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

export type IngestionRecordSource = 'millennium' | 'pko' | 'erste' | 'ing' | 'mbank' | 'unknown' | 'manual';

export type IngestionRecordOrigin = 'capture' | 'manual';

export type IngestionRecordStatus = 'pending' | 'posted' | 'reversed';

export type IngestionReviewReason = 'amount' | 'currency' | 'direction' | 'merchant';

export const ingestionTransactionTypes = [
  'cardPayment',
  'blikPayment',
  'outgoingTransfer',
  'incomingTransfer',
  'atmWithdrawal',
  'refund',
  'fee',
  'interest',
] as const;

export type IngestionTransactionType = (typeof ingestionTransactionTypes)[number];

export interface IngestionRecord {
  id: string;
  bank: IngestionRecordSource;
  direction: 'expense' | 'income';
  transactionType?: IngestionTransactionType;
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
  eventId?: string;
  reportingAmountMinor?: number;
  exchangeRate?: string;
  exchangeRateDate?: string;
  exchangeRateTable?: string;
}

export interface StorageDiagnostics {
  cipherVersion: string;
  databasePath: string;
  lastAttemptAt?: string;
  lastAttemptOutcome?: 'success' | 'ignored' | 'failure';
  lastAttemptFailureReason?: string;
  lastFailureAt?: string;
  lastFailureReason?: string;
}

interface BankStatsIngestionNativeModule {
  configureSpendingWidget?(configuration: string): void;
  ingestSynthetic(): Promise<IngestionRecord>;
  ingestSyntheticApplePayTransaction(): Promise<IngestionRecord>;
  deleteSyntheticRecords?(): Promise<number>;
  clearRecords?(): Promise<void>;
  saveRecord?(record: IngestionRecord): Promise<IngestionRecord>;
  deleteRecord?(id: string): Promise<number>;
  listRecords(): Promise<IngestionRecord[]>;
  extractPdfText?(uri: string): Promise<string>;
  readDocument?(key: string): Promise<string | null>;
  writeDocument?(key: string, value: string): Promise<void>;
  deleteDocument?(key: string): Promise<void>;
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

export function extractPdfText(uri: string): Promise<string> {
  const module = requireIosModule();

  if (typeof module.extractPdfText !== 'function') {
    return Promise.reject(
      new Error('Reading a PDF statement requires a development build that includes extractPdfText'),
    );
  }

  return module.extractPdfText(uri);
}

export function listIngestionRecords(): Promise<IngestionRecord[]> {
  return requireIosModule().listRecords();
}

export function supportsEncryptedDocuments(): boolean {
  return (
    Platform.OS === 'ios' &&
    typeof nativeModule?.readDocument === 'function' &&
    typeof nativeModule.writeDocument === 'function' &&
    typeof nativeModule.deleteDocument === 'function'
  );
}

export async function readEncryptedDocument(key: string): Promise<string | null> {
  const value = await requireIosModule().readDocument?.(key);

  return value ?? null;
}

export async function writeEncryptedDocument(key: string, value: string): Promise<void> {
  await requireIosModule().writeDocument?.(key, value);
}

export async function deleteEncryptedDocument(key: string): Promise<void> {
  await requireIosModule().deleteDocument?.(key);
}

export function getIngestionStorageDiagnostics(): Promise<StorageDiagnostics> {
  return requireIosModule().storageDiagnostics();
}

export function configureSpendingWidget(configuration: string): boolean {
  if (Platform.OS !== 'ios' || nativeModule?.configureSpendingWidget === undefined) {
    return false;
  }

  nativeModule.configureSpendingWidget(configuration);
  return true;
}
