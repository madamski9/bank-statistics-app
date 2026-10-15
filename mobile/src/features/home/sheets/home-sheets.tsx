import { Modal } from 'react-native';

import { CustomCategoriesScreen } from '@/features/data/classification/custom-categories/custom-categories-screen';
import { IgnoredPaymentsScreen } from '@/features/data/ignored-payments/ignored-payments-screen';
import { LanguageScreen } from '@/features/app-shell/localization/language-screen/language-screen';
import { AlertsScreen } from '@/features/insights/alerts/alerts-screen/alerts-screen';
import { requestAlertPermission } from '@/features/insights/alerts/delivery/expo-alert-notifier';
import { AlertRuleSheet } from '@/features/insights/alerts/rule-sheet/alert-rule-sheet';
import { EventsScreen } from '@/features/insights/events/events-screen/events-screen';
import { ForecastScreen } from '@/features/insights/forecast/forecast-screen';
import { MonthlySummaryScreen } from '@/features/insights/monthly-summary/summary-screen/monthly-summary-screen';
import { SubscriptionsScreen } from '@/features/insights/subscriptions/subscriptions-screen';
import { DataScreen } from '@/features/settings/account-data/data-screen';
import { CaptureHealthScreen } from '@/features/settings/capture-health/capture-health-screen';
import { canCreateCustomCategory } from '@/features/settings/premium/premium-access';
import { PremiumScreen } from '@/features/settings/premium/premium-screen';
import type { PremiumStatus } from '@/features/settings/premium/use-premium';
import { PrivacyShield } from '@/features/settings/privacy/privacy-shield';
import { PrivacySettingsScreen } from '@/features/settings/privacy/settings-screen/privacy-settings-screen';

import type { AlertEditing } from '@/features/home/state/use-alert-editor';
import type { CategoryActions } from '@/features/home/state/use-category-actions';
import type { HomeLedger } from '@/features/home/state/use-home-ledger';
import type { HomeSheets as HomeSheetsState } from '@/features/home/state/use-home-sheets';
import type { MonthlySummaryLauncher } from '@/features/home/state/use-monthly-summary-launcher';
import type { OverviewInsights } from '@/features/home/state/use-overview-insights';
import type { RunningEventState } from '@/features/home/state/use-running-event';

interface HomeSheetsProps {
  sheets: HomeSheetsState;
  ledger: HomeLedger;
  insights: OverviewInsights;
  alertEditing: AlertEditing;
  events: RunningEventState;
  monthlySummary: MonthlySummaryLauncher;
  categoryActions: CategoryActions;
  premium: PremiumStatus | undefined;
  hasPremiumAccess: boolean;
}

export function HomeSheets(props: HomeSheetsProps) {
  const { sheets, alertEditing } = props;

  return (
    <Modal
      animationType="slide"
      onRequestClose={alertEditing.editor === null ? sheets.closeSheet : alertEditing.close}
      presentationStyle="pageSheet"
      visible={sheets.activeSheet !== null || alertEditing.editor !== null}
    >
      <ActiveSheet {...props} />
      <PrivacyShield />
    </Modal>
  );
}

function ActiveSheet({
  sheets,
  ledger,
  insights,
  alertEditing,
  events,
  monthlySummary,
  categoryActions,
  premium,
  hasPremiumAccess,
}: HomeSheetsProps) {
  const { closeSheet } = sheets;
  const { editor } = alertEditing;

  if (editor !== null) {
    return (
      <AlertRuleSheet
        isFirstRule={alertEditing.isFirstRule}
        isScopeLocked={editor.isScopeLocked === true}
        merchants={alertEditing.merchants}
        onCancel={alertEditing.close}
        onDelete={editor.rule === null ? undefined : alertEditing.remove}
        onRequestPermission={requestAlertPermission}
        onSave={alertEditing.save}
        rule={editor.rule}
        scope={editor.scope}
      />
    );
  }

  switch (sheets.activeSheet) {
    case 'data':
      return (
        <DataScreen
          accounts={ledger.financialAccounts.accounts}
          onClose={closeSheet}
          onRecordsChanged={ledger.refresh}
          records={ledger.records}
        />
      );
    case 'premium':
      return <PremiumScreen onClose={sheets.closePremium} reason={sheets.premiumReason} status={premium} />;
    case 'language':
      return <LanguageScreen onClose={closeSheet} />;
    case 'privacy':
      return <PrivacySettingsScreen onClose={closeSheet} />;
    case 'events':
      return (
        <EventsScreen
          events={ledger.spendingEvents.events}
          initialEventId={events.eventsSheetTarget}
          onClose={closeSheet}
          onDelete={ledger.spendingEvents.remove}
          onEnd={ledger.spendingEvents.end}
          onSave={ledger.spendingEvents.save}
          records={ledger.countedRecords}
          rules={ledger.rules}
          showsHistory={events.showsEventHistory}
        />
      );
    case 'recurring':
      return (
        <SubscriptionsScreen
          candidates={insights.recurringPaymentCandidates}
          hasDismissed={insights.dismissedSubscriptions.dismissed.size > 0}
          onClose={closeSheet}
          onDismiss={insights.dismissedSubscriptions.dismiss}
          onRemoveTracked={async (key) => {
            await insights.dismissedSubscriptions.dismiss(key);
            await insights.trackedSubscriptions.untrack(key);
          }}
          onRestoreAll={insights.dismissedSubscriptions.restoreAll}
          onTrack={insights.trackedSubscriptions.track}
          payments={insights.recurringPayments}
        />
      );
    case 'monthlySummary':
      return (
        <MonthlySummaryScreen
          events={ledger.spendingEvents.events}
          initialMonth={monthlySummary.summaryMonthKey}
          key={monthlySummary.summaryMonthKey ?? 'latest'}
          onClose={closeSheet}
          records={ledger.countedRecords}
          recurring={insights.recurringPayments}
          reminder={monthlySummary.reminder}
          rules={ledger.rules}
        />
      );
    case 'forecast':
      return (
        <ForecastScreen
          awaitingConversion={ledger.awaitingConversion}
          forecast={insights.forecast}
          onClose={closeSheet}
        />
      );
    case 'captureHealth':
      return <CaptureHealthScreen onClose={closeSheet} records={ledger.records} />;
    case 'ignoredPayments':
      return (
        <IgnoredPaymentsScreen
          onClose={closeSheet}
          onIgnore={ledger.ignoredPayments.ignore}
          onStopIgnoring={ledger.ignoredPayments.stopIgnoring}
          records={ledger.records}
          rules={ledger.ignoredPayments.rules}
        />
      );
    case 'categories':
      return (
        <CustomCategoriesScreen
          canAssignMerchant={premium?.isPremium === true}
          canCreate={canCreateCustomCategory(hasPremiumAccess)}
          categories={ledger.customCategories.categories}
          onAssignMerchants={categoryActions.assignCategoryMerchants}
          onClose={closeSheet}
          onCreate={ledger.customCategories.create}
          onDelete={ledger.customCategories.remove}
          onForgetMerchant={ledger.categorization.forget}
          onRename={ledger.customCategories.rename}
          onRequirePremium={categoryActions.requireCategoryPremium}
          records={ledger.countedRecords}
          rules={ledger.rules}
        />
      );
    default:
      return (
        <AlertsScreen
          entries={alertEditing.entries}
          onClose={closeSheet}
          onCreate={() => alertEditing.requestNewLimit({ kind: 'all' })}
          onEdit={alertEditing.editRule}
        />
      );
  }
}
