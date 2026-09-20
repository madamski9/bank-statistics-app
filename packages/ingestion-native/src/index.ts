import { requireOptionalNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

export interface IngestionRecord {
  id: string;
  bank: 'millennium';
  direction: 'expense' | 'income';
  transactionType?: 'cardPayment' | 'outgoingTransfer' | 'incomingTransfer';
  amountMinor: number;
  currency: string;
  merchant?: string;
  accountName?: string;
  occurredAt: string;
  capturedAt: string;
  sourceApp: string;
  status: 'pending';
}

export interface StorageDiagnostics {
  cipherVersion: string;
  databasePath: string;
  /** ISO 8601 timestamp of the last time the background App Intent ran, success or failure. */
  lastAttemptAt?: string;
  lastAttemptOutcome?: 'success' | 'failure';
  /** A coarse, non-sensitive failure code (e.g. "unsupportedNotification"). Never raw text. */
  lastAttemptFailureReason?: string;
}

interface BankStatsIngestionNativeModule {
  ingestSynthetic(): Promise<IngestionRecord>;
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

export function listIngestionRecords(): Promise<IngestionRecord[]> {
  return requireIosModule().listRecords();
}

export function getIngestionStorageDiagnostics(): Promise<StorageDiagnostics> {
  return requireIosModule().storageDiagnostics();
}
