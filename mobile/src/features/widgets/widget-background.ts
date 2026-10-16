import type { IngestionRecord } from '@bankstats/ingestion-native';

import { setCustomCategories, type CustomCategory } from '@/features/data/classification/categories';
import { isIgnored, type IgnoreRule } from '@/features/data/ignored-payments/ignore-rule';
import { setCurrentLanguage, type Language } from '@/features/app-shell/localization/language';
import type { AlertMessage } from '@/features/insights/alerts/delivery/alert-message';
import { paymentAlertMessages } from '@/features/insights/alerts/delivery/payment-alert';

import {
  buildSpendingWidgetProps,
  lockedWidgetProps,
  signedOutWidgetProps,
  widgetEntries,
  type WidgetPrivacy,
  type SnapshotSources,
} from './widget-snapshot';

export interface WidgetBackgroundConfiguration {
  enabled: boolean;
  isPremium?: boolean;
  alertRules: SnapshotSources['alertRules'];
  categorizationRules: SnapshotSources['categorizationRules'];
  customCategories?: CustomCategory[];
  ignoreRules?: IgnoreRule[];
  openUrl: string;
  revealUrl?: string;
  privacy?: WidgetPrivacy;
  language?: Language;
}

function countedRecords(configuration: WidgetBackgroundConfiguration, records: IngestionRecord[]) {
  return records.filter(
    (record) =>
      (record.merchant !== 'SKLEP TEST' || record.origin === 'manual') &&
      !isIgnored(record, configuration.ignoreRules ?? []),
  );
}

function applyEnvironment(configuration: WidgetBackgroundConfiguration): void {
  if (configuration.language !== undefined) {
    setCurrentLanguage(configuration.language);
  }

  setCustomCategories(configuration.customCategories ?? []);
}

export function snapshot(
  configuration: WidgetBackgroundConfiguration,
  records: IngestionRecord[],
  referenceMs: number,
  updatedAtMs: number = referenceMs,
) {
  const reference = new Date(referenceMs);

  applyEnvironment(configuration);

  if (!configuration.enabled) {
    return signedOutWidgetProps(reference, configuration.openUrl);
  }

  if (configuration.isPremium === false) {
    return lockedWidgetProps(reference, configuration.openUrl);
  }

  return buildSpendingWidgetProps({
    ...configuration,
    records: countedRecords(configuration, records),
    reference,
    updatedAt: new Date(updatedAtMs),
  });
}

export function timeline(
  configuration: WidgetBackgroundConfiguration,
  records: IngestionRecord[],
  referenceMs: number,
) {
  return widgetEntries(
    (moment) => snapshot(configuration, records, moment.getTime(), referenceMs),
    configuration.privacy ?? { isBlurred: false, revealedUntilMs: 0 },
    new Date(referenceMs),
  ).map((entry) => ({ timestamp: entry.date.getTime(), props: entry.props }));
}

export function paymentAlerts(
  configuration: WidgetBackgroundConfiguration,
  records: IngestionRecord[],
  recordId: string,
  referenceMs: number,
): AlertMessage[] {
  if (!configuration.enabled) {
    return [];
  }

  applyEnvironment(configuration);
  const counted = countedRecords(configuration, records);
  const record = counted.find((candidate) => candidate.id === recordId);

  if (record === undefined) {
    return [];
  }

  return paymentAlertMessages(configuration.alertRules, record, counted, {
    reference: new Date(referenceMs),
    rules: configuration.categorizationRules,
    hasAggressiveTone: configuration.isPremium === true,
  });
}
