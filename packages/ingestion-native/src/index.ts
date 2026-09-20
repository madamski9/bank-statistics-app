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

export function listIngestionRecords(): Promise<IngestionRecord[]> {
  return requireIosModule().listRecords();
}

export function getIngestionStorageDiagnostics(): Promise<StorageDiagnostics> {
  return requireIosModule().storageDiagnostics();
}
