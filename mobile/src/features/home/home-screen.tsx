import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { overviewColors } from '@/features/app-shell/theme/overview-theme';
import type { SpendingDimension } from '@/features/data/classification/spending-groups';
import { useAlerts } from '@/features/insights/alerts/use-alerts';
import { canCreateCustomCategory, canStartEvent } from '@/features/settings/premium/premium-access';
import { usePremium } from '@/features/settings/premium/use-premium';

import { MerchantDetail } from '@/features/home/merchants/merchant-detail/merchant-detail';
import { MerchantsScreen } from '@/features/home/merchants/merchants-screen';
import { HomeTabBar } from '@/features/home/navigation/home-tab-bar';
import type { PageKey } from '@/features/home/navigation/home-pages';
import { useHomePager } from '@/features/home/navigation/use-home-pager';
import { BubbleDetail } from '@/features/home/overview/bubble-detail/bubble-detail';
import { OverviewScreen } from '@/features/home/overview/overview-screen';
import { ProfileScreen } from '@/features/home/profile/profile-screen';
import { HomeSheets } from '@/features/home/sheets/home-sheets';
import { WidgetPreviewSheet } from '@/features/home/sheets/widget-preview-sheet';
import { useAlertEditor } from '@/features/home/state/use-alert-editor';
import { useCategoryActions } from '@/features/home/state/use-category-actions';
import { useHomeLedger } from '@/features/home/state/use-home-ledger';
import { useHomeSheets } from '@/features/home/state/use-home-sheets';
import { useHomeWidget } from '@/features/home/state/use-home-widget';
import { useMonthlySummaryLauncher } from '@/features/home/state/use-monthly-summary-launcher';
import { useOverviewInsights } from '@/features/home/state/use-overview-insights';
import { useRunningEvent } from '@/features/home/state/use-running-event';
import { useSpendingNumbers } from '@/features/home/state/use-spending-numbers';
import { useSpendingPeriod } from '@/features/home/state/use-spending-period';
import { useSpendingSelection } from '@/features/home/state/use-spending-selection';
import { TransactionsScreen } from '@/features/home/transactions/transactions-screen';

interface HomeScreenProps {
  initialPage?: PageKey;
}

export function HomeScreen({ initialPage = 'overview' }: HomeScreenProps) {
  const { page, pagerRef, width, initialOffset, goToPage, handleScroll } = useHomePager(initialPage);
  const ledger = useHomeLedger();
  const { countedRecords, rules } = ledger;
  const sheets = useHomeSheets();
  const { openSheet, openPremium } = sheets;
  const premium = usePremium();
  const isPremium = premium?.isPremium === true;
  const hasPremiumAccess = premium === undefined || premium.isPremium;
  const [dimension, setDimension] = useState<SpendingDimension>('merchant');
  const { period, periodLocks, changePeriod } = useSpendingPeriod(hasPremiumAccess, openPremium);
  const numbers = useSpendingNumbers({ records: ledger.records, countedRecords, rules, period, dimension });
  const alerts = useAlerts({ records: countedRecords, categorizationRules: rules, hasAggressiveTone: isPremium });
  const insights = useOverviewInsights({
    countedRecords,
    rules,
    spendWindow: numbers.spendWindow,
    alertRules: alerts.rules,
    showsCandidates: sheets.activeSheet === 'recurring',
  });
  const selection = useSpendingSelection({
    countedRecords,
    rules,
    spendWindow: numbers.spendWindow,
    summary: numbers.summary,
    previousSummary: numbers.previousSummary,
  });
  const alertEditing = useAlertEditor({
    alerts,
    countedRecords,
    rules,
    group: selection.group,
    hasPremiumAccess,
    openPremium,
  });
  const openEventsSheet = useCallback(() => openSheet('events'), [openSheet]);
  const openMonthlySummarySheet = useCallback(() => openSheet('monthlySummary'), [openSheet]);
  const events = useRunningEvent({
    countedRecords,
    rules,
    spendingEvents: ledger.spendingEvents,
    onOpenEvents: openEventsSheet,
    openPremium,
  });
  const monthlySummary = useMonthlySummaryLauncher({ premium, onOpen: openMonthlySummarySheet, openPremium });
  const categoryActions = useCategoryActions(ledger.categorization, isPremium, openPremium);
  const widget = useHomeWidget({ ledger, isPremium: premium?.isPremium, alertRules: alerts.rules, rules });

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />

      <HomeTabBar onSelect={goToPage} page={page} />

      <ScrollView
        canCancelContentTouches
        contentOffset={initialOffset}
        horizontal
        onScroll={handleScroll}
        pagingEnabled
        ref={pagerRef}
        scrollEnabled={selection.selection === null && selection.group === null}
        scrollEventThrottle={16}
        showsHorizontalScrollIndicator={false}
        style={styles.pager}
      >
        <View style={{ width }}>
          <OverviewScreen
            error={ledger.error}
            forecast={insights.forecast}
            hasData={ledger.records.length > 0}
            isLoading={ledger.isLoading}
            isReportLocked={!isPremium}
            lockedPeriods={periodLocks}
            onChangePeriod={changePeriod}
            onOpenForecast={() => openSheet('forecast')}
            onOpenRecurring={() => openSheet('recurring')}
            onOpenEvents={events.openEvents}
            onOpenReport={monthlySummary.openReport}
            onSelectBubble={selection.selectBubble}
            onStartEvent={events.startEvent}
            onToggleEventFocus={events.toggleEventFocus}
            period={period}
            recurringCount={insights.recurringCount}
            recurringMonthlyMinor={insights.recurringMonthlyMinor}
            reportMonth={insights.reportMonth}
            canStartEvent={canStartEvent(hasPremiumAccess)}
            isEventFocused={events.isEventFocused}
            onRequireEventPremium={events.requireEventPremium}
            runningEvent={events.runningEventSummary}
            summary={numbers.summary}
          />
        </View>
        <View style={{ width }}>
          <TransactionsScreen
            accounts={ledger.financialAccounts.accounts}
            error={ledger.error}
            isLoading={ledger.isLoading}
            onChanged={ledger.refresh}
            onCreateAccount={ledger.financialAccounts.create}
            onRememberRule={categoryActions.rememberCategoryRule}
            records={ledger.records}
            rules={rules}
            events={ledger.spendingEvents.events}
            customCategories={ledger.customCategories.categories}
            canCreateCategory={canCreateCustomCategory(hasPremiumAccess)}
            canRememberRule={isPremium}
            onCreateCategory={ledger.customCategories.create}
            ignoreRules={ledger.ignoredPayments.rules}
            onIgnore={ledger.ignoredPayments.ignore}
            onStopIgnoring={ledger.ignoredPayments.stopIgnoring}
            onRequirePremium={categoryActions.requireCategoryPremium}
          />
        </View>
        <View style={{ width }}>
          <MerchantsScreen
            dimension={dimension}
            error={ledger.error}
            groups={numbers.groups}
            isLoading={ledger.isLoading}
            onChangeDimension={setDimension}
            lockedPeriods={periodLocks}
            onChangePeriod={changePeriod}
            onOpenCategories={() => openSheet('categories')}
            onCreateLimit={() => alertEditing.requestNewLimit({ kind: 'all' })}
            onOpenIgnoredPayments={() => openSheet('ignoredPayments')}
            onSelectGroup={selection.selectGroup}
            period={period}
          />
        </View>
        <View style={{ width }}>
          <ProfileScreen
            onOpenEventHistory={events.openEventHistory}
            onOpenAlerts={() => openSheet('alerts')}
            onOpenCaptureHealth={() => openSheet('captureHealth')}
            onOpenCategories={() => openSheet('categories')}
            onOpenData={() => openSheet('data')}
            onOpenLanguage={() => openSheet('language')}
            onOpenPremium={() => openPremium(null)}
            onOpenPrivacy={() => openSheet('privacy')}
            premium={premium}
            syncStatus={ledger.syncStatus}
          />
        </View>
      </ScrollView>

      {selection.selection !== null ? (
        <BubbleDetail
          change={selection.selectedChange}
          key={selection.revision}
          lockedPeriods={periodLocks}
          onChangePeriod={changePeriod}
          onClosed={selection.closeBubble}
          onSelectSource={selection.selectSource}
          period={period}
          selection={selection.selection}
          summary={numbers.summary}
          trend={numbers.trend}
        />
      ) : null}

      {selection.group !== null ? (
        <MerchantDetail
          group={selection.group}
          limit={alertEditing.selectedLimit}
          onClosed={selection.closeGroup}
          onEditLimit={alertEditing.editGroupLimit}
          period={period}
          rules={rules}
          spendWindow={numbers.spendWindow}
        />
      ) : null}

      <HomeSheets
        alertEditing={alertEditing}
        categoryActions={categoryActions}
        events={events}
        hasPremiumAccess={hasPremiumAccess}
        insights={insights}
        ledger={ledger}
        monthlySummary={monthlySummary}
        premium={premium}
        sheets={sheets}
      />

      <WidgetPreviewSheet onClose={widget.closeWidgetPreview} props={widget.widgetPreviewProps} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: overviewColors.background,
  },
  pager: {
    flex: 1,
  },
});
