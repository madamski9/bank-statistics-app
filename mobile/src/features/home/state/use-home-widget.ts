import { useMemo } from 'react';

import type { CategorizationRule } from '@/features/data/classification/categorization-rule';
import type { AlertRule } from '@/features/insights/alerts/rules/alert-rule';
import { usePrivacy } from '@/features/settings/privacy/privacy-provider';
import { useSpendingWidget } from '@/features/widgets/use-spending-widget';
import { buildSpendingWidgetProps } from '@/features/widgets/widget-snapshot';

import type { HomeLedger } from './use-home-ledger';

interface HomeWidgetOptions {
  ledger: HomeLedger;
  isPremium: boolean | undefined;
  alertRules: AlertRule[];
  rules: CategorizationRule[];
}

export function useHomeWidget({ ledger, isPremium, alertRules, rules }: HomeWidgetOptions) {
  const { records } = ledger;
  const {
    settings: privacySettings,
    widgetRevealedUntilMs,
    isWidgetPreviewOpen,
    closeWidgetPreview,
  } = usePrivacy();
  const widgetPrivacy = useMemo(
    () => ({ isBlurred: privacySettings.isWidgetBlurred, revealedUntilMs: widgetRevealedUntilMs }),
    [privacySettings.isWidgetBlurred, widgetRevealedUntilMs],
  );

  useSpendingWidget({
    isReady: !ledger.isLoading && ledger.error === null,
    isPremium,
    records,
    alertRules,
    categorizationRules: rules,
    customCategories: ledger.customCategories.categories,
    ignoreRules: ledger.ignoredPayments.rules,
    privacy: widgetPrivacy,
  });

  const widgetPreviewProps = useMemo(
    () =>
      isWidgetPreviewOpen
        ? buildSpendingWidgetProps({
            records,
            alertRules,
            categorizationRules: rules,
            reference: new Date(),
            openUrl: '',
          })
        : null,
    [alertRules, isWidgetPreviewOpen, records, rules],
  );

  return { widgetPreviewProps, closeWidgetPreview };
}
