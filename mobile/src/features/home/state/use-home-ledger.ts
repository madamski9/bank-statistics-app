import { useCallback, useMemo } from 'react';

import { setCustomCategories } from '@/features/data/classification/categories';
import { useCustomCategories } from '@/features/data/classification/custom-categories/use-custom-categories';
import { useCategorizationRules } from '@/features/data/classification/rules/use-categorization-rules';
import { useCurrencyConversion } from '@/features/data/currency-conversion/use-currency-conversion';
import { useFinancialAccounts } from '@/features/data/financial-accounts/use-financial-accounts';
import { useIgnoredPayments } from '@/features/data/ignored-payments/use-ignored-payments';
import { useCloudSync } from '@/features/data/sync/use-cloud-sync';
import { awaitingConversionCount, statisticalRecords } from '@/features/home/transactions/record/transaction-record';
import { useEvents } from '@/features/insights/events/use-events';

import { useCapturedSpending } from './use-captured-spending';

export function useHomeLedger() {
  const { error, isLoading, records: capturedRecords, refresh } = useCapturedSpending();
  const ignoredPayments = useIgnoredPayments(capturedRecords, refresh);
  const records = ignoredPayments.keptRecords;
  const financialAccounts = useFinancialAccounts();
  const { reload: reloadAccounts } = financialAccounts;
  const customCategories = useCustomCategories();
  const { reload: reloadCategories } = customCategories;
  const spendingEvents = useEvents();
  const { reload: reloadEvents } = spendingEvents;
  const categorization = useCategorizationRules();
  const refreshAfterPull = useCallback(
    () =>
      Promise.all([refresh(), reloadAccounts(), reloadCategories(), reloadEvents()]).then(
        () => undefined,
      ),
    [refresh, reloadAccounts, reloadCategories, reloadEvents],
  );
  const syncStatus = useCloudSync({
    records,
    accounts: financialAccounts.accounts,
    categories: customCategories.categories,
    events: spendingEvents.events,
    onPulled: refreshAfterPull,
  });
  useCurrencyConversion(records, refresh);

  const countedRecords = useMemo(() => {
    setCustomCategories(customCategories.categories);

    return statisticalRecords(records);
  }, [records, customCategories.categories]);
  const awaitingConversion = useMemo(() => awaitingConversionCount(records), [records]);

  return {
    error,
    isLoading,
    refresh,
    records,
    countedRecords,
    awaitingConversion,
    ignoredPayments,
    financialAccounts,
    customCategories,
    spendingEvents,
    categorization,
    rules: categorization.rules,
    syncStatus,
  };
}

export type HomeLedger = ReturnType<typeof useHomeLedger>;
