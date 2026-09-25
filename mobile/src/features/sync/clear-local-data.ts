import { clearIngestionRecords } from '@bankstats/ingestion-native';

import { clearAlertStorage } from '@/features/alerts/secure-alert-storage';
import { clearCategorizationRules } from '@/features/classification/use-categorization-rules';
import { clearAccountStorage } from '@/features/financial-accounts/file-account-storage';
import { clearPrivacyStorage } from '@/features/privacy/privacy-storage';

import { clearLedger } from './file-ledger-storage';

export async function clearLocalData(): Promise<void> {
  await clearIngestionRecords();
  await Promise.all([clearAlertStorage(), clearCategorizationRules(), clearPrivacyStorage()]);
  clearAccountStorage();
  clearLedger();
}
