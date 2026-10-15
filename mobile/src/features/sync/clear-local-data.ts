import { clearIngestionRecords } from '@bankstats/ingestion-native';

import { clearAlertStorage } from '@/features/alerts/secure-alert-storage';
import { clearCustomCategories } from '@/features/classification/custom-category-storage';
import { clearCategorizationRules } from '@/features/classification/use-categorization-rules';
import { clearEvents } from '@/features/events/event-storage';
import { clearIgnoreRules } from '@/features/ignored-payments/ignore-rule-storage';
import { clearAccountStorage } from '@/features/financial-accounts/encrypted-account-storage';
import { clearMonthlySummaryPreference } from '@/features/monthly-summary/monthly-summary-preference';
import { clearPrivacyStorage } from '@/features/privacy/privacy-storage';
import { clearDismissedSubscriptions } from '@/features/subscriptions/dismissed-subscriptions';
import { clearTrackedSubscriptions } from '@/features/subscriptions/tracked-subscriptions';

import { clearCloudSyncPreference } from './cloud-sync-preference';
import { clearLedger } from './encrypted-ledger-storage';

export async function clearLocalData(): Promise<void> {
  await Promise.all([
    clearAccountStorage(),
    clearLedger(),
    clearCustomCategories(),
    clearEvents(),
  ]);
  await clearIngestionRecords();
  await Promise.all([
    clearAlertStorage(),
    clearCategorizationRules(),
    clearPrivacyStorage(),
    clearCloudSyncPreference(),
    clearDismissedSubscriptions(),
    clearTrackedSubscriptions(),
    clearIgnoreRules(),
    clearMonthlySummaryPreference(),
  ]);
}
