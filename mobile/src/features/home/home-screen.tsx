import { useUser } from '@clerk/expo';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import Animated, {
  interpolate,
  interpolateColor,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { alertProgress } from '@/features/alerts/alert-evaluation';
import { AlertRuleSheet } from '@/features/alerts/alert-rule-sheet';
import type { AlertRule, AlertScope } from '@/features/alerts/alert-rule';
import { AlertsScreen } from '@/features/alerts/alerts-screen';
import { requestAlertPermission } from '@/features/alerts/expo-alert-notifier';
import { groupLimit, ruleForScope, scopeForGroup } from '@/features/alerts/group-limit';
import { merchantOptions } from '@/features/alerts/merchant-options';
import { useAlerts } from '@/features/alerts/use-alerts';
import {
  groupSpending,
  type SpendingDimension,
  type SpendingGroup,
} from '@/features/classification/spending-groups';
import { useCategorizationRules } from '@/features/classification/use-categorization-rules';
import { DataScreen } from '@/features/account-data/data-screen';
import { accountInitial } from '@/features/profile/account-identity';
import { OverviewScreen } from '@/features/overview/overview-screen';
import { expenseRhythm } from '@/features/overview/spending-rhythm';
import { BubbleDetail } from '@/features/spending-overview/bubble-detail';
import {
  bubbleSelectionReducer,
  initialBubbleSelection,
} from '@/features/spending-overview/bubble-selection';
import type { BubbleOrigin } from '@/features/spending-overview/glass-bubble';
import {
  overviewColors,
  overviewSpacing,
  type BubbleKey,
} from '@/features/spending-overview/overview-theme';
import {
  periodWindow,
  previousPeriodWindow,
  type SpendingPeriod,
} from '@/features/spending-overview/periods';
import {
  periodChange,
  summarizeSpending,
  type SpendingSource,
} from '@/features/spending-overview/spending-summary';
import { useCapturedSpending } from '@/features/spending-overview/use-captured-spending';
import { useFinancialAccounts } from '@/features/financial-accounts/use-financial-accounts';
import { MerchantDetail } from '@/features/merchants/merchant-detail';
import { MerchantsScreen } from '@/features/merchants/merchants-screen';
import {
  canCreateLimit,
  fallbackPeriod,
  lockedPeriods,
  type PremiumReason,
} from '@/features/premium/premium-access';
import { PremiumScreen } from '@/features/premium/premium-screen';
import { usePremium } from '@/features/premium/use-premium';
import { PrivacySettingsScreen } from '@/features/privacy/privacy-settings-screen';
import { usePrivacy } from '@/features/privacy/privacy-provider';
import { ProfileScreen } from '@/features/profile/profile-screen';
import { useCloudSync } from '@/features/sync/use-cloud-sync';
import { affectsStatistics } from '@/features/transactions/transaction-record';
import { TransactionsScreen } from '@/features/transactions/transactions-screen';
import { useSpendingWidget } from '@/features/widgets/use-spending-widget';
import { WidgetPreview } from '@/features/widgets/widget-preview';
import { buildSpendingWidgetProps } from '@/features/widgets/widget-snapshot';

const pages = [
  { key: 'overview', label: 'Przegląd' },
  { key: 'transactions', label: 'Transakcje' },
  { key: 'merchants', label: 'Sklepy' },
] as const;

type TabKey = (typeof pages)[number]['key'];
type PageKey = TabKey | 'profile';

const navLabelFontSize = 24;

const pageOrder: readonly PageKey[] = [...pages.map((entry) => entry.key), 'profile'];
type SheetKey = 'alerts' | 'data' | 'privacy' | 'premium';

interface AlertEditor {
  scope: AlertScope;
  rule: AlertRule | null;
  isScopeLocked?: boolean;
}

/**
 * The persistent shell: Overview and Transactions side by side in a pager, the settings avatar,
 * and the bubble detail on top of both so its expansion is measured against the window.
 */

export function HomeScreen() {
  const { user } = useUser();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const pagerRef = useRef<ScrollView>(null);
  const [page, setPage] = useState<PageKey>('overview');
  const [requestedPeriod, setRequestedPeriod] = useState<SpendingPeriod>('month');
  const [{ selection, revision }, dispatchSelection] = useReducer(
    bubbleSelectionReducer,
    initialBubbleSelection,
  );
  const [group, setGroup] = useState<SpendingGroup | null>(null);
  const [dimension, setDimension] = useState<SpendingDimension>('merchant');
  const [activeSheet, setActiveSheet] = useState<SheetKey | null>(null);
  const [navViewportWidth, setNavViewportWidth] = useState(0);
  const [navFontSize, setNavFontSize] = useState(navLabelFontSize);
  const profileTabProgress = useSharedValue(0);
  const { error, isLoading, records, refresh } = useCapturedSpending();
  const financialAccounts = useFinancialAccounts();
  const { reload: reloadAccounts } = financialAccounts;
  const refreshAfterPull = useCallback(
    () => Promise.all([refresh(), reloadAccounts()]).then(() => undefined),
    [refresh, reloadAccounts],
  );
  const syncStatus = useCloudSync({
    records,
    accounts: financialAccounts.accounts,
    onPulled: refreshAfterPull,
  });
  const { remember, rules } = useCategorizationRules();
  const premium = usePremium();
  const hasPremiumAccess = premium === undefined || premium.isPremium;
  const periodLocks = useMemo(() => lockedPeriods(hasPremiumAccess), [hasPremiumAccess]);
  const period = periodLocks.has(requestedPeriod) ? fallbackPeriod : requestedPeriod;
  const [premiumReason, setPremiumReason] = useState<PremiumReason | null>(null);
  const [premiumReturnSheet, setPremiumReturnSheet] = useState<SheetKey | null>(null);

  const openPremium = useCallback(
    (reason: PremiumReason | null) => {
      setPremiumReason(reason);
      setPremiumReturnSheet(activeSheet === 'premium' ? null : activeSheet);
      setActiveSheet('premium');
    },
    [activeSheet],
  );

  const changePeriod = useCallback(
    (next: SpendingPeriod) => {
      if (periodLocks.has(next)) {
        openPremium('period');
        return;
      }

      setRequestedPeriod(next);
    },
    [openPremium, periodLocks],
  );
  const [alertEditor, setAlertEditor] = useState<AlertEditor | null>(null);
  const countedRecords = useMemo(() => records.filter(affectsStatistics), [records]);

  /**
   * One window, shared by every page so the bubbles, the shop ranking and a shop's chart can
   * never disagree about which days they are describing. `records` is a real dependency: it
   * re-anchors the rolling window to "now" when fresh captures arrive, which is the only
   * moment the app learns that time has passed.
   */
  // eslint-disable-next-line react-hooks/exhaustive-deps -- see above
  const spendWindow = useMemo(() => periodWindow(period, new Date()), [period, records]);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- see above
  const previousWindow = useMemo(() => previousPeriodWindow(period, new Date()), [period, records]);
  const summary = useMemo(
    () => summarizeSpending(countedRecords, spendWindow, rules),
    [countedRecords, rules, spendWindow],
  );
  const rhythm = useMemo(
    () => expenseRhythm(countedRecords, summary.currency, spendWindow, period),
    [countedRecords, period, spendWindow, summary.currency],
  );
  const previousSummary = useMemo(
    () =>
      previousWindow === null
        ? null
        : summarizeSpending(countedRecords, previousWindow, rules),
    [countedRecords, previousWindow, rules],
  );
  const groups = useMemo(
    () => groupSpending(countedRecords, { window: spendWindow, rules, dimension }),
    [countedRecords, dimension, rules, spendWindow],
  );
  const alerts = useAlerts({ records: countedRecords, categorizationRules: rules });
  const { settings: privacySettings, widgetRevealedUntilMs, isWidgetPreviewOpen, closeWidgetPreview } =
    usePrivacy();
  const widgetPrivacy = useMemo(
    () => ({ isBlurred: privacySettings.isWidgetBlurred, revealedUntilMs: widgetRevealedUntilMs }),
    [privacySettings.isWidgetBlurred, widgetRevealedUntilMs],
  );
  useSpendingWidget({
    isReady: !isLoading && error === null,
    isPremium: premium?.isPremium,
    records,
    alertRules: alerts.rules,
    categorizationRules: rules,
    privacy: widgetPrivacy,
  });
  const widgetPreviewProps = useMemo(
    () =>
      isWidgetPreviewOpen
        ? buildSpendingWidgetProps({
            records,
            alertRules: alerts.rules,
            categorizationRules: rules,
            reference: new Date(),
            openUrl: '',
          })
        : null,
    [alerts.rules, isWidgetPreviewOpen, records, rules],
  );
  const alertMerchants = useMemo(() => merchantOptions(countedRecords, rules), [countedRecords, rules]);
  const selectedLimit = useMemo(
    () =>
      group === null
        ? null
        : groupLimit(group, alerts.rules, countedRecords, rules, new Date()),
    [alerts.rules, countedRecords, group, rules],
  );
  const alertEntries = useMemo(
    () =>
      alerts.rules.map((rule) => ({
        rule,
        progress: alertProgress(rule, countedRecords, { reference: new Date(), rules }),
      })),
    [alerts.rules, countedRecords, rules],
  );

  const requestNewLimit = useCallback(
    (scope: AlertScope, isScopeLocked = false) => {
      if (!canCreateLimit(alerts.rules.length, hasPremiumAccess)) {
        openPremium('limit');
        return;
      }

      setAlertEditor({ scope, rule: null, isScopeLocked });
    },
    [alerts.rules.length, hasPremiumAccess, openPremium],
  );

  const handleEditLimit = useCallback(() => {
    if (group === null) {
      return;
    }

    const scope = scopeForGroup(group);
    const rule = ruleForScope(alerts.rules, scope);

    if (rule === null) {
      requestNewLimit(scope, true);
      return;
    }

    setAlertEditor({ scope, rule, isScopeLocked: true });
  }, [alerts.rules, group, requestNewLimit]);

  const handleSaveAlert = useCallback(
    async (rule: AlertRule) => {
      await alerts.save(rule);
      setAlertEditor(null);
    },
    [alerts],
  );

  const handleDeleteAlert = useCallback(
    async (id: string) => {
      await alerts.remove(id);
      setAlertEditor(null);
    },
    [alerts],
  );

  const pageIndex = Math.max(pageOrder.indexOf(page), 0);
  const alignedWidth = useRef(width);

  /**
   * Realign only when the viewport itself changes, e.g. on rotation. Reacting to the page as
   * well would fire an instant scroll in the middle of the animated one a tab tap starts, and
   * would yank the pager out from under a finger mid-swipe.
   */
  useEffect(() => {
    if (alignedWidth.current === width) {
      return;
    }

    alignedWidth.current = width;
    pagerRef.current?.scrollTo({ x: pageIndex * width, animated: false });
  }, [pageIndex, width]);

  const goToPage = useCallback(
    (next: PageKey) => {
      setPage(next);
      pagerRef.current?.scrollTo({
        x: Math.max(pageOrder.indexOf(next), 0) * width,
        animated: true,
      });
    },
    [width],
  );

  /** Stable, so memoised OverviewScreen survives a selection or a page change untouched. */
  const handleSelectBubble = useCallback((key: BubbleKey, origin: BubbleOrigin) => {
    dispatchSelection({ type: 'select', selection: { key, origin } });
  }, []);

  const handleDetailClosed = useCallback(() => {
    dispatchSelection({ type: 'closed', revision });
  }, [revision]);

  const handleSelectSource = useCallback(
    (source: SpendingSource) => {
      if (source.group === null) {
        return;
      }

      const { dimension: sourceDimension, key } = source.group;
      const match = groupSpending(countedRecords, {
        window: spendWindow,
        rules,
        dimension: sourceDimension,
      }).find((candidate) => candidate.key === key);

      if (match !== undefined) {
        setGroup(match);
      }
    },
    [countedRecords, rules, spendWindow],
  );

  const handleGroupClosed = useCallback(() => {
    setGroup(null);
  }, []);

  /**
   * Fires per frame, but only ever calls setState when the pager crosses the halfway mark, so
   * the tab label tracks the finger at the cost of one render per page change.
   */
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.min(
      Math.max(Math.round(event.nativeEvent.contentOffset.x / Math.max(width, 1)), 0),
      pageOrder.length - 1,
    );
    const next = pageOrder[index];

    if (next !== page) {
      setPage(next);
    }
  };

  useEffect(() => {
    profileTabProgress.set(
      withTiming(page === 'profile' ? 1 : 0, { duration: 220, reduceMotion: ReduceMotion.System }),
    );
  }, [page, profileTabProgress]);

  const profileTabStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(profileTabProgress.get(), [0, 1], [1, 1.12]) }],
    backgroundColor: interpolateColor(
      profileTabProgress.get(),
      [0, 1],
      [overviewColors.surfacePressed, overviewColors.textPrimary],
    ),
  }));

  const profileInitialStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      profileTabProgress.get(),
      [0, 1],
      [overviewColors.textPrimary, overviewColors.background],
    ),
  }));

  const expenseChange =
    previousSummary === null
      ? null
      : periodChange(summary.expenseMinor, previousSummary.expenseMinor);
  const selectedChange =
    previousSummary === null || selection === null
      ? null
      : selection.key === 'expense'
        ? periodChange(summary.expenseMinor, previousSummary.expenseMinor)
        : selection.key === 'income'
          ? periodChange(summary.incomeMinor, previousSummary.incomeMinor)
          : periodChange(summary.netMinor, previousSummary.netMinor);

  const initial = accountInitial(user);

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />

      <View style={[styles.nav, { paddingTop: insets.top + 12 }]}>
        <View
          accessibilityRole="tablist"
          onLayout={(event) => {
            setNavViewportWidth(event.nativeEvent.layout.width);
            setNavFontSize(navLabelFontSize);
          }}
          style={styles.navViewport}
        >
          <View
            onLayout={(event) => {
              const rowWidth = event.nativeEvent.layout.width;

              if (navViewportWidth > 0 && rowWidth > navViewportWidth) {
                setNavFontSize((current) => Math.floor(current * (navViewportWidth / rowWidth) * 10) / 10);
              }
            }}
            style={styles.navRow}
          >
            {pages.map((entry) => {
              const isActive = entry.key === page;

              return (
                <Pressable
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isActive }}
                  hitSlop={8}
                  key={entry.key}
                  onPress={() => goToPage(entry.key)}
                  style={({ pressed }) => [styles.navTab, pressed ? styles.pressed : null]}
                >
                  <Text
                    maxFontSizeMultiplier={1.4}
                    style={[
                      styles.navLabel,
                      { fontSize: navFontSize },
                      isActive ? styles.navLabelActive : null,
                    ]}
                  >
                    {entry.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        <Pressable
          accessibilityHint="Pokazuje profil i ustawienia konta"
          accessibilityLabel={user?.firstName ? `Konto: ${user.firstName}` : 'Konto'}
          accessibilityRole="tab"
          accessibilityState={{ selected: page === 'profile' }}
          hitSlop={8}
          onPress={() => goToPage('profile')}
          style={({ pressed }) => (pressed ? styles.pressed : null)}
        >
          <Animated.View style={[styles.avatar, profileTabStyle]}>
            <Animated.Text maxFontSizeMultiplier={1.3} style={[styles.avatarInitial, profileInitialStyle]}>
              {initial}
            </Animated.Text>
          </Animated.View>
        </Pressable>
      </View>

      <ScrollView
        canCancelContentTouches
        horizontal
        onScroll={handleScroll}
        pagingEnabled
        ref={pagerRef}
        scrollEnabled={selection === null && group === null}
        scrollEventThrottle={16}
        showsHorizontalScrollIndicator={false}
        style={styles.pager}
      >
        <View style={{ width }}>
          <OverviewScreen
            error={error}
            expenseChange={expenseChange}
            hasData={records.length > 0}
            isLoading={isLoading}
            lockedPeriods={periodLocks}
            onChangePeriod={changePeriod}
            onSelectBubble={handleSelectBubble}
            period={period}
            rhythm={rhythm}
            summary={summary}
          />
        </View>
        <View style={{ width }}>
          <TransactionsScreen
            accounts={financialAccounts.accounts}
            error={error}
            isLoading={isLoading}
            onChanged={refresh}
            onCreateAccount={financialAccounts.create}
            onRememberRule={remember}
            records={records}
            rules={rules}
          />
        </View>
        <View style={{ width }}>
          <MerchantsScreen
            dimension={dimension}
            error={error}
            groups={groups}
            isLoading={isLoading}
            onChangeDimension={setDimension}
            lockedPeriods={periodLocks}
            onChangePeriod={changePeriod}
            onCreateLimit={() => requestNewLimit({ kind: 'all' })}
            onSelectGroup={setGroup}
            period={period}
          />
        </View>
        <View style={{ width }}>
          <ProfileScreen
            onOpenAlerts={() => setActiveSheet('alerts')}
            onOpenData={() => setActiveSheet('data')}
            onOpenPremium={() => openPremium(null)}
            onOpenPrivacy={() => setActiveSheet('privacy')}
            premium={premium}
            syncStatus={syncStatus}
          />
        </View>
      </ScrollView>

      {selection !== null ? (
        <BubbleDetail
          change={selectedChange}
          key={revision}
          lockedPeriods={periodLocks}
          onChangePeriod={changePeriod}
          onClosed={handleDetailClosed}
          onSelectSource={handleSelectSource}
          period={period}
          selection={selection}
          summary={summary}
        />
      ) : null}

      {group !== null ? (
        <MerchantDetail
          group={group}
          limit={selectedLimit}
          onClosed={handleGroupClosed}
          onEditLimit={handleEditLimit}
          period={period}
          spendWindow={spendWindow}
        />
      ) : null}

      <Modal
        animationType="slide"
        onRequestClose={() => (alertEditor === null ? setActiveSheet(null) : setAlertEditor(null))}
        presentationStyle="pageSheet"
        visible={activeSheet !== null || alertEditor !== null}
      >
        {alertEditor !== null ? (
          <AlertRuleSheet
            isFirstRule={alerts.rules.length === 0}
            isScopeLocked={alertEditor.isScopeLocked === true}
            merchants={alertMerchants}
            onCancel={() => setAlertEditor(null)}
            onDelete={alertEditor.rule === null ? undefined : handleDeleteAlert}
            onRequestPermission={requestAlertPermission}
            onSave={handleSaveAlert}
            rule={alertEditor.rule}
            scope={alertEditor.scope}
          />
        ) : activeSheet === 'data' ? (
          <DataScreen
            accounts={financialAccounts.accounts}
            onClose={() => setActiveSheet(null)}
            records={records}
          />
        ) : activeSheet === 'premium' ? (
          <PremiumScreen
            onClose={() => setActiveSheet(premiumReturnSheet)}
            reason={premiumReason}
            status={premium}
          />
        ) : activeSheet === 'privacy' ? (
          <PrivacySettingsScreen onClose={() => setActiveSheet(null)} />
        ) : (
          <AlertsScreen
            entries={alertEntries}
            onClose={() => setActiveSheet(null)}
            onCreate={() => requestNewLimit({ kind: 'all' })}
            onEdit={(rule) => setAlertEditor({ scope: rule.scope, rule })}
          />
        )}
      </Modal>

      <Modal
        animationType="slide"
        onRequestClose={closeWidgetPreview}
        presentationStyle="pageSheet"
        visible={widgetPreviewProps !== null}
      >
        {widgetPreviewProps !== null ? (
          <WidgetPreview onClose={closeWidgetPreview} props={widgetPreviewProps} />
        ) : null}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: overviewColors.background,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: overviewSpacing.gutter,
    paddingBottom: overviewSpacing.tight,
  },
  navViewport: {
    flex: 1,
    overflow: 'hidden',
  },
  navRow: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  navTab: {
    minHeight: 44,
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
  navLabel: {
    fontWeight: '700',
    letterSpacing: -0.6,
    color: overviewColors.textSecondary,
  },
  navLabelActive: {
    color: overviewColors.textPrimary,
  },
  avatar: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    backgroundColor: overviewColors.surfacePressed,
    overflow: 'hidden',
  },
  avatarInitial: {
    fontSize: 15,
    fontWeight: '600',
    color: overviewColors.textPrimary,
  },
  pager: {
    flex: 1,
  },
});
