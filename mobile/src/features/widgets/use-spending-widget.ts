import type { IngestionRecord } from '@bankstats/ingestion-native';
import { requireOptionalNativeModule } from 'expo';
import * as Linking from 'expo-linking';
import { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';

import type { AlertRule } from '@/features/alerts/alert-rule';
import type { CategorizationRule } from '@/features/classification/categorization-rule';

import type { SpendingWidget } from './spending-widget';
import { widgetRevealParams } from './widget-links';
import {
  buildSpendingWidgetProps,
  signedOutWidgetProps,
  widgetEntries,
  type SpendingWidgetProps,
  type WidgetPrivacy,
} from './widget-snapshot';

const publishDebounceMs = 400;

interface SpendingWidgetSources {
  isReady: boolean;
  records: IngestionRecord[];
  alertRules: AlertRule[];
  categorizationRules: CategorizationRule[];
  privacy: WidgetPrivacy;
}

function loadSpendingWidget(): SpendingWidget | null {
  if (Platform.OS !== 'ios' || requireOptionalNativeModule('ExpoWidgets') === null) {
    return null;
  }

  const widgetModule: typeof import('./spending-widget') = require('./spending-widget');

  return widgetModule.spendingWidget;
}

const spendingWidget = loadSpendingWidget();

function publish(props: SpendingWidgetProps, privacy: WidgetPrivacy): void {
  if (spendingWidget === null) {
    return;
  }

  const entries = widgetEntries(props, privacy, new Date());
  const [first] = entries;

  if (entries.length === 1 && first !== undefined) {
    spendingWidget.updateSnapshot(first.props);
  } else {
    spendingWidget.updateTimeline(entries);
  }
}

async function currentStep(): Promise<number> {
  if (spendingWidget === null) {
    return 0;
  }

  try {
    const [entry] = await spendingWidget.getTimeline();

    return typeof entry?.props.step === 'number' ? entry.props.step : 0;
  } catch {
    return 0;
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

export function useSpendingWidget({
  isReady,
  records,
  alertRules,
  categorizationRules,
  privacy,
}: SpendingWidgetSources): void {
  const foregroundTick = useForegroundTick();

  useEffect(() => {
    if (spendingWidget === null || !isReady) {
      return;
    }

    let isCurrent = true;
    const timer = setTimeout(() => {
      void currentStep().then((step) => {
        if (!isCurrent) {
          return;
        }

        publish(
          buildSpendingWidgetProps({
            records,
            alertRules,
            categorizationRules,
            reference: new Date(),
            openUrl: Linking.createURL('/'),
            revealUrl: Linking.createURL('/', { queryParams: widgetRevealParams }),
            step,
          }),
          privacy,
        );
      });
    }, publishDebounceMs);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [alertRules, categorizationRules, foregroundTick, isReady, privacy, records]);
}

export function SignedOutSpendingWidget(): null {
  useEffect(() => {
    publish(signedOutWidgetProps(new Date(), Linking.createURL('/')), {
      isBlurred: false,
      revealedUntilMs: 0,
    });
  }, []);

  return null;
}
