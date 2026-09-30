import type { IngestionRecord } from '@bankstats/ingestion-native';

import { setCustomCategories, type CustomCategory } from '@/features/classification/categories';
import { setCurrentLanguage, type Language } from '@/features/localization/language';

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
  openUrl: string;
  revealUrl?: string;
  privacy?: WidgetPrivacy;
  language?: Language;
}

export function snapshot(
  configuration: WidgetBackgroundConfiguration,
  records: IngestionRecord[],
  referenceMs: number,
) {
  const reference = new Date(referenceMs);

  if (configuration.language !== undefined) {
    setCurrentLanguage(configuration.language);
  }

  setCustomCategories(configuration.customCategories ?? []);

  if (!configuration.enabled) {
    return signedOutWidgetProps(reference, configuration.openUrl);
  }

  if (configuration.isPremium === false) {
    return lockedWidgetProps(reference, configuration.openUrl);
  }

  return buildSpendingWidgetProps({
    ...configuration,
    records: records.filter((record) => record.merchant !== 'SKLEP TEST' || record.origin === 'manual'),
    reference,
  });
}

export function timeline(
  configuration: WidgetBackgroundConfiguration,
  records: IngestionRecord[],
  referenceMs: number,
) {
  return widgetEntries(
    snapshot(configuration, records, referenceMs),
    configuration.privacy ?? { isBlurred: false, revealedUntilMs: 0 },
    new Date(referenceMs),
  ).map((entry) => ({ timestamp: entry.date.getTime(), props: entry.props }));
}
