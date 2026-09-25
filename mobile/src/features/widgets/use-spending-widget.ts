import { configureSpendingWidget, type IngestionRecord } from '@bankstats/ingestion-native';
import { requireOptionalNativeModule } from 'expo';
import * as Linking from 'expo-linking';
import { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';

import type { AlertRule } from '@/features/alerts/alert-rule';
import type { CategorizationRule } from '@/features/classification/categorization-rule';
import { useLanguage } from '@/features/localization/language';

import type { WidgetBackgroundConfiguration } from './widget-background';
import { widgetRevealParams } from './widget-links';
import {
  buildSpendingWidgetProps,
  lockedWidgetProps,
  signedOutWidgetProps,
  widgetEntries,
  type SpendingWidgetProps,
  type WidgetPrivacy,
} from './widget-snapshot';

const publishDebounceMs = 400;

interface SpendingWidgetSources {
  isReady: boolean;
  isPremium: boolean | undefined;
  privacy: WidgetPrivacy;
  records: IngestionRecord[];
  alertRules: AlertRule[];
  categorizationRules: CategorizationRule[];
}

function loadSpendingWidgets() {
  if (Platform.OS !== 'ios' || requireOptionalNativeModule('ExpoWidgets') === null) {
    return [];
  }

  const widgetModule: typeof import('./spending-widget') = require('./spending-widget');

  return widgetModule.spendingWidgets;
}

const spendingWidgets = loadSpendingWidgets();

function publish(props: SpendingWidgetProps, privacy: WidgetPrivacy): void {
  for (const { screen, widget } of spendingWidgets) {
    widget.updateTimeline(widgetEntries({ ...props, screen }, privacy, new Date()));
  }
}

function configure(configuration: WidgetBackgroundConfiguration): boolean {
  try {
    return configureSpendingWidget(JSON.stringify(configuration));
  } catch (error) {
    console.warn('Could not configure background widget updates', error);
    return false;
  }
}

function useForegroundTick(): number {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        setTick((current) => current + 1);
      }
    });

    return () => subscription.remove();
  }, []);

  return tick;
}

export function useSpendingWidget({ isReady, isPremium, records, alertRules, categorizationRules, privacy }: SpendingWidgetSources): void {
  const foregroundTick = useForegroundTick();
  const language = useLanguage();

  useEffect(() => {
    if (spendingWidgets.length === 0 || !isReady || isPremium === undefined) {
      return;
    }

    const timer = setTimeout(() => {
      const openUrl = Linking.createURL('/');
      const revealUrl = Linking.createURL('/', { queryParams: widgetRevealParams });
      const configured = configure({
        enabled: true,
        isPremium,
        alertRules,
        categorizationRules,
        openUrl,
        revealUrl,
        privacy,
        language,
      });

      if (!configured) {
        publish(
          isPremium
            ? buildSpendingWidgetProps({ records, alertRules, categorizationRules, reference: new Date(), openUrl, revealUrl })
            : lockedWidgetProps(new Date(), openUrl),
          privacy,
        );
      }
    }, publishDebounceMs);

    return () => clearTimeout(timer);
  }, [
    alertRules,
    categorizationRules,
    foregroundTick,
    isPremium,
    isReady,
    language,
    records,
    privacy,
  ]);
}

export function SignedOutSpendingWidget(): null {
  const language = useLanguage();

  useEffect(() => {
    const openUrl = Linking.createURL('/');
    configure({ enabled: false, alertRules: [], categorizationRules: [], openUrl, language });
    publish(signedOutWidgetProps(new Date(), openUrl), { isBlurred: false, revealedUntilMs: 0 });
  }, [language]);

  return null;
}
