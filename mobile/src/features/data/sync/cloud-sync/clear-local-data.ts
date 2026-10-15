import { clearIngestionRecords } from '@bankstats/ingestion-native';

import { clearAlertStorage } from '@/features/insights/alerts/rules/secure-alert-storage';
import { clearCustomCategories } from '@/features/data/classification/custom-categories/custom-category-storage';
import { clearCategorizationRules } from '@/features/data/classification/rules/use-categorization-rules';
import { clearEvents } from '@/features/insights/events/event-storage';
import { clearIgnoreRules } from '@/features/data/ignored-payments/ignore-rule-storage';
import { clearAccountStorage } from '@/features/data/financial-accounts/encrypted-account-storage';
import { clearMonthlySummaryPreference } from '@/features/insights/monthly-summary/reminder/monthly-summary-preference';
import { clearPrivacyStorage } from '@/features/settings/privacy/privacy-storage';
import { clearDismissedSubscriptions } from '@/features/insights/subscriptions/dismissed-subscriptions';
import { clearTrackedSubscriptions } from '@/features/insights/subscriptions/tracked-subscriptions';

import { clearCloudSyncPreference } from './cloud-sync-preference';
import { clearLedger } from '../codecs/encrypted-ledger-storage';

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
