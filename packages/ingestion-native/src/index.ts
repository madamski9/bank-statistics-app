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

interface BankStatsIngestionNativeModule {
  ingestSynthetic(): Promise<IngestionRecord>;
  listRecords(): Promise<IngestionRecord[]>;
  storageDiagnostics(): Promise<{ cipherVersion: string; databasePath: string }>;
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

export function getIngestionStorageDiagnostics(): Promise<{
  cipherVersion: string;
  databasePath: string;
}> {
  return requireIosModule().storageDiagnostics();
}
