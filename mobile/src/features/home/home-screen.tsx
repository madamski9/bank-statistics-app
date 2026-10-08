import { useUser } from '@clerk/expo';
import * as Notifications from 'expo-notifications';
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
  withSpring,
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
import { setCustomCategories } from '@/features/classification/categories';
import {
  groupSpending,
  type SpendingDimension,
  type SpendingGroup,
} from '@/features/classification/spending-groups';
import { CustomCategoriesScreen } from '@/features/classification/custom-categories-screen';
import { useCategorizationRules } from '@/features/classification/use-categorization-rules';
import { useCustomCategories } from '@/features/classification/use-custom-categories';
import { CaptureHealthScreen } from '@/features/capture-health/capture-health-screen';
import { useCurrencyConversion } from '@/features/currency-conversion/use-currency-conversion';
import { summarizeEvent } from '@/features/events/event-summary';
import { EventsScreen } from '@/features/events/events-screen';
import { activeEvent } from '@/features/events/spending-event';
import { useEvents } from '@/features/events/use-events';
import { ForecastScreen } from '@/features/forecast/forecast-screen';
import { IgnoredPaymentsScreen } from '@/features/ignored-payments/ignored-payments-screen';
import { useIgnoredPayments } from '@/features/ignored-payments/use-ignored-payments';
import { monthForecast } from '@/features/forecast/month-forecast';
import { monthOf, shiftMonth } from '@/features/monthly-summary/monthly-summary';
import { summaryMonthFromNotification } from '@/features/monthly-summary/monthly-summary-reminder';
import { MonthlySummaryScreen } from '@/features/monthly-summary/monthly-summary-screen';
import { useMonthlySummaryReminder } from '@/features/monthly-summary/use-monthly-summary-reminder';
import {
  detectRecurringPayments,
  monthlyRecurringCost,
} from '@/features/subscriptions/recurring-payments';
import { SubscriptionsScreen } from '@/features/subscriptions/subscriptions-screen';
import { useDismissedSubscriptions } from '@/features/subscriptions/use-dismissed-subscriptions';
import { DataScreen } from '@/features/account-data/data-screen';
import { accountInitial } from '@/features/profile/account-identity';
import { OverviewScreen } from '@/features/overview/overview-screen';
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
import { PrivacyShield } from '@/features/privacy/privacy-shield';
import {
  periodChange,
  summarizeSpending,
  type SpendingSource,
} from '@/features/spending-overview/spending-summary';
import { spendingTrend } from '@/features/spending-overview/spending-trend';
import { useCapturedSpending } from '@/features/spending-overview/use-captured-spending';
import { useFinancialAccounts } from '@/features/financial-accounts/use-financial-accounts';
import { MerchantDetail } from '@/features/merchants/merchant-detail';
import { MerchantsScreen } from '@/features/merchants/merchants-screen';
import {
  canCreateCustomCategory,
  canCreateLimit,
  canOpenMonthlyReport,
  canStartEvent,
  fallbackPeriod,
  lockedPeriods,
  type PremiumReason,
} from '@/features/premium/premium-access';
import { PremiumScreen } from '@/features/premium/premium-screen';
import { usePremium } from '@/features/premium/use-premium';
import { PrivacySettingsScreen } from '@/features/privacy/privacy-settings-screen';
import { useCopy } from '@/features/localization/language';
import { LanguageScreen } from '@/features/localization/language-screen';
import { usePrivacy } from '@/features/privacy/privacy-provider';
import { ProfileScreen } from '@/features/profile/profile-screen';
import { useCloudSync } from '@/features/sync/use-cloud-sync';
import { awaitingConversionCount, statisticalRecords } from '@/features/transactions/transaction-record';
import { TransactionsScreen } from '@/features/transactions/transactions-screen';
import { useSpendingWidget } from '@/features/widgets/use-spending-widget';
import { WidgetPreview } from '@/features/widgets/widget-preview';
import { buildSpendingWidgetProps } from '@/features/widgets/widget-snapshot';

import { homeCopy } from './home-copy';

const pages = [
  { key: 'overview' },
  { key: 'transactions' },
  { key: 'merchants' },
] as const;

type TabKey = (typeof pages)[number]['key'];
export type PageKey = TabKey | 'profile';

const navLabelFontSize = 24;
const navFadeWidth = 40;

const pageOrder: readonly PageKey[] = [...pages.map((entry) => entry.key), 'profile'];
type SheetKey =
  | 'alerts'
  | 'data'
  | 'privacy'
  | 'premium'
  | 'language'
  | 'events'
  | 'recurring'
  | 'monthlySummary'
  | 'forecast'
  | 'captureHealth'
  | 'categories'
  | 'ignoredPayments';

interface AlertEditor {
  scope: AlertScope;
  rule: AlertRule | null;
  isScopeLocked?: boolean;
}

interface HomeScreenProps {
  initialPage?: PageKey;
}

export function HomeScreen({ initialPage = 'overview' }: HomeScreenProps) {
  const { user } = useUser();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const pagerRef = useRef<ScrollView>(null);
  const copy = useCopy(homeCopy);
  const [page, setPage] = useState<PageKey>(initialPage);
  const [requestedPeriod, setRequestedPeriod] = useState<SpendingPeriod>(fallbackPeriod);
  const [{ selection, revision }, dispatchSelection] = useReducer(
    bubbleSelectionReducer,
    initialBubbleSelection,
  );
  const [group, setGroup] = useState<SpendingGroup | null>(null);
  const [dimension, setDimension] = useState<SpendingDimension>('merchant');
  const [activeSheet, setActiveSheet] = useState<SheetKey | null>(null);
  const [navViewportWidth, setNavViewportWidth] = useState(0);
  const [navRowWidth, setNavRowWidth] = useState(0);
  const [titleOffsets, setTitleOffsets] = useState<Partial<Record<TabKey, number>>>({});
  const navOffset = useSharedValue(0);
  const navLeadingFade = useSharedValue(0);
  const navTrailingFade = useSharedValue(0);
  const profileTabProgress = useSharedValue(0);
  const { error, isLoading, records: capturedRecords, refresh } = useCapturedSpending();
  const ignoredPayments = useIgnoredPayments(capturedRecords, refresh);
  const records = ignoredPayments.keptRecords;
  const financialAccounts = useFinancialAccounts();
  const { reload: reloadAccounts } = financialAccounts;
  const customCategories = useCustomCategories();
  const { reload: reloadCategories } = customCategories;
  const spendingEvents = useEvents();
  const { reload: reloadEvents } = spendingEvents;
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
  const dismissedSubscriptions = useDismissedSubscriptions();
  const premium = usePremium();
  const monthlySummaryReminder = useMonthlySummaryReminder(premium?.isPremium);
  const { confirmPermission: confirmMonthlySummaryPermission } = monthlySummaryReminder;
  const [eventsSheetTarget, setEventsSheetTarget] = useState<string | null>(null);
  const [summaryMonthKey, setSummaryMonthKey] = useState<string | null>(null);
  const { assignMerchant, forget: forgetMerchant, remember, rules } = useCategorizationRules();
  const hasPremiumAccess = premium === undefined || premium.isPremium;
  const periodLocks = useMemo(() => lockedPeriods(hasPremiumAccess), [hasPremiumAccess]);
  const period = periodLocks.has(requestedPeriod) ? fallbackPeriod : requestedPeriod;
  const [premiumReason, setPremiumReason] = useState<PremiumReason | null>(null);
  const [premiumReturnSheet, setPremiumReturnSheet] = useState<SheetKey | null>(null);
  const [alertEditor, setAlertEditor] = useState<AlertEditor | null>(null);

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
  const runningEvent = useMemo(() => activeEvent(spendingEvents.events), [spendingEvents.events]);
  const countedRecords = useMemo(() => {
    setCustomCategories(customCategories.categories);

    return statisticalRecords(records);
  }, [records, customCategories.categories]);
  const awaitingConversion = useMemo(() => awaitingConversionCount(records), [records]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const spendWindow = useMemo(() => periodWindow(period, new Date()), [period, records]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const previousWindow = useMemo(() => previousPeriodWindow(period, new Date()), [period, records]);
  const summary = useMemo(
    () => summarizeSpending(countedRecords, spendWindow, rules),
    [countedRecords, rules, spendWindow],
  );
  const trend = useMemo(
    () => spendingTrend(countedRecords, summary.currency, spendWindow, period),
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
  const insightsNow = useMemo(() => new Date(spendWindow.endMs), [spendWindow.endMs]);
  const recurringPayments = useMemo(
    () =>
      detectRecurringPayments(countedRecords, rules, insightsNow, dismissedSubscriptions.dismissed),
    [countedRecords, dismissedSubscriptions.dismissed, insightsNow, rules],
  );
  const monthlyLimitTarget = useMemo(
    () =>
      alerts.rules.find(
        (rule) =>
          rule.isActive &&
          rule.metric === 'expense' &&
          rule.condition === 'threshold' &&
          rule.scope.kind === 'all' &&
          rule.period.kind === 'month',
      )?.targetMinor ?? null,
    [alerts.rules],
  );
  const forecast = useMemo(
    () => monthForecast(countedRecords, recurringPayments, insightsNow, monthlyLimitTarget),
    [countedRecords, insightsNow, monthlyLimitTarget, recurringPayments],
  );
  const runningEventSummary = useMemo(
    () =>
      runningEvent === null
        ? null
        : summarizeEvent(countedRecords, runningEvent, spendingEvents.events, rules, new Date()),
    [countedRecords, rules, runningEvent, spendingEvents.events],
  );
  const [isEventFocused, setIsEventFocused] = useState(true);
  const { start: startSpendingEvent } = spendingEvents;
  const startEvent = useCallback(
    async (name: string) => {
      const started = await startSpendingEvent(name);
      setIsEventFocused(true);

      return started;
    },
    [startSpendingEvent],
  );
  const requireEventPremium = useCallback(() => openPremium('event'), [openPremium]);
  const toggleEventFocus = useCallback(() => setIsEventFocused((current) => !current), []);
  const recurringMonthlyMinor = useMemo(() => monthlyRecurringCost(recurringPayments), [recurringPayments]);
  const recurringCount = useMemo(
    () => recurringPayments.filter((payment) => payment.isActive).length,
    [recurringPayments],
  );
  const reportMonth = shiftMonth(monthOf(insightsNow), -1).month;
  const isReportLocked = premium?.isPremium !== true;
  const [showsEventHistory, setShowsEventHistory] = useState(false);
  const openEvents = useCallback(() => {
    setEventsSheetTarget(runningEvent?.id ?? null);
    setShowsEventHistory(runningEvent === null);
    setActiveSheet('events');
  }, [runningEvent]);
  const openEventHistory = useCallback(() => {
    setEventsSheetTarget(null);
    setShowsEventHistory(true);
    setActiveSheet('events');
  }, []);
  const openRecurring = useCallback(() => setActiveSheet('recurring'), []);
  const openForecast = useCallback(() => setActiveSheet('forecast'), []);
  const openMonthlySummary = useCallback(
    (month: string | null = null) => {
      if (!canOpenMonthlyReport(premium?.isPremium === true)) {
        openPremium('report');
        return;
      }

      void confirmMonthlySummaryPermission();
      setSummaryMonthKey(month);
      setActiveSheet('monthlySummary');
    },
    [confirmMonthlySummaryPermission, openPremium, premium?.isPremium],
  );
  const openReport = useCallback(() => openMonthlySummary(null), [openMonthlySummary]);
  const requireCategoryPremium = useCallback(() => openPremium('category'), [openPremium]);
  const [opensCategoryCreate, setOpensCategoryCreate] = useState(false);
  const [isSheetPresented, setIsSheetPresented] = useState(false);
  const isSheetVisible = activeSheet !== null || alertEditor !== null;

  if (!isSheetVisible && isSheetPresented) {
    setIsSheetPresented(false);
  }

  const openCategories = useCallback(() => {
    setOpensCategoryCreate(false);
    setActiveSheet('categories');
  }, []);
  const createCategory = useCallback(() => {
    if (!canCreateCustomCategory(hasPremiumAccess)) {
      requireCategoryPremium();
      return;
    }

    setOpensCategoryCreate(true);
    setActiveSheet('categories');
  }, [hasPremiumAccess, requireCategoryPremium]);
  const assignCategoryMerchant = useCallback(
    async (merchantKey: string, merchantName: string, category: string) => {
      if (premium?.isPremium !== true) {
        requireCategoryPremium();
        return false;
      }

      await assignMerchant(merchantKey, merchantName, category);
      return true;
    },
    [assignMerchant, premium?.isPremium, requireCategoryPremium],
  );
  const rememberCategoryRule = useCallback(
    async (merchantLabel: string, category: string) => {
      if (premium?.isPremium !== true) {
        requireCategoryPremium();
        return;
      }

      await remember(merchantLabel, category);
    },
    [premium?.isPremium, remember, requireCategoryPremium],
  );

  const {
    lockReason,
    settings: privacySettings,
    widgetRevealedUntilMs,
    isWidgetPreviewOpen,
    closeWidgetPreview,
  } = usePrivacy();
  const isUnlocked = lockReason === null;

  useEffect(() => {
    if (premium === undefined || !isUnlocked) {
      return;
    }

    let isActive = true;
    const openFromNotification = (response: Notifications.NotificationResponse | null) => {
      const month = summaryMonthFromNotification(response);

      if (month !== null) {
        Notifications.clearLastNotificationResponse();
        openMonthlySummary(month);
      }
    };

    Promise.resolve().then(() => {
      if (isActive) {
        openFromNotification(Notifications.getLastNotificationResponse());
      }
    });
    const subscription = Notifications.addNotificationResponseReceivedListener(openFromNotification);

    return () => {
      isActive = false;
      subscription.remove();
    };
  }, [isUnlocked, openMonthlySummary, premium]);
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
    customCategories: customCategories.categories,
    ignoreRules: ignoredPayments.rules,
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

  useEffect(() => {
    const target = titleOffsets[page === 'profile' ? 'merchants' : page];

    if (target === undefined || navViewportWidth === 0 || navRowWidth === 0) {
      return;
    }

    const maximumOffset = Math.max(navRowWidth - navViewportWidth, 0);
    const offset = Math.min(target, maximumOffset);
    const fade = { duration: 220, reduceMotion: ReduceMotion.System };

    navOffset.set(
      withSpring(-offset, { duration: 420, dampingRatio: 0.9, reduceMotion: ReduceMotion.System }),
    );
    navLeadingFade.set(withTiming(offset > 0 ? 1 : 0, fade));
    navTrailingFade.set(withTiming(offset < maximumOffset ? 1 : 0, fade));
  }, [navLeadingFade, navOffset, navRowWidth, navTrailingFade, navViewportWidth, page, titleOffsets]);

  const navRowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: navOffset.get() }],
  }));

  const navLeadingFadeStyle = useAnimatedStyle(() => ({
    opacity: navLeadingFade.get(),
  }));

  const navTrailingFadeStyle = useAnimatedStyle(() => ({
    opacity: navTrailingFade.get(),
  }));

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
          onLayout={(event) => setNavViewportWidth(event.nativeEvent.layout.width)}
          style={styles.navViewport}
        >
          <Animated.View
            onLayout={(event) => setNavRowWidth(event.nativeEvent.layout.width)}
            style={[styles.navRow, navRowStyle]}
          >
            {pages.map((entry) => {
              const isActive = entry.key === page;

              return (
                <Pressable
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isActive }}
                  hitSlop={8}
                  key={entry.key}
                  onLayout={(event) => {
                    const { x } = event.nativeEvent.layout;

                    setTitleOffsets((current) =>
                      current[entry.key] === x ? current : { ...current, [entry.key]: x },
                    );
                  }}
                  onPress={() => goToPage(entry.key)}
                  style={({ pressed }) => [styles.navTab, pressed ? styles.pressed : null]}
                >
                  <Text
                    maxFontSizeMultiplier={1.4}
                    style={[styles.navLabel, isActive ? styles.navLabelActive : null]}
                  >
                    {copy.tabs[entry.key]}
                  </Text>
                </Pressable>
              );
            })}
          </Animated.View>
          <Animated.View pointerEvents="none" style={[styles.navLeadingFade, navLeadingFadeStyle]} />
          <Animated.View pointerEvents="none" style={[styles.navTrailingFade, navTrailingFadeStyle]} />
        </View>
        <Pressable
          accessibilityHint={copy.accountHint}
          accessibilityLabel={user?.firstName ? copy.accountOf(user.firstName) : copy.account}
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
        contentOffset={{ x: pageOrder.indexOf(initialPage) * width, y: 0 }}
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
            forecast={forecast}
            hasData={records.length > 0}
            isLoading={isLoading}
            isReportLocked={isReportLocked}
            lockedPeriods={periodLocks}
            onChangePeriod={changePeriod}
            onOpenForecast={openForecast}
            onOpenRecurring={openRecurring}
            onOpenEvents={openEvents}
            onOpenReport={openReport}
            onSelectBubble={handleSelectBubble}
            onStartEvent={startEvent}
            onToggleEventFocus={toggleEventFocus}
            period={period}
            recurringCount={recurringCount}
            recurringMonthlyMinor={recurringMonthlyMinor}
            reportMonth={reportMonth}
            canStartEvent={canStartEvent(hasPremiumAccess)}
            isEventFocused={isEventFocused}
            onRequireEventPremium={requireEventPremium}
            runningEvent={runningEventSummary}
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
            onRememberRule={rememberCategoryRule}
            records={records}
            rules={rules}
            events={spendingEvents.events}
            customCategories={customCategories.categories}
            canCreateCategory={canCreateCustomCategory(hasPremiumAccess)}
            canRememberRule={premium?.isPremium === true}
            onCreateCategory={customCategories.create}
            ignoreRules={ignoredPayments.rules}
            onIgnore={ignoredPayments.ignore}
            onStopIgnoring={ignoredPayments.stopIgnoring}
            onRequirePremium={requireCategoryPremium}
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
            onCreateCategory={createCategory}
            onCreateLimit={() => requestNewLimit({ kind: 'all' })}
            onOpenIgnoredPayments={() => setActiveSheet('ignoredPayments')}
            onSelectGroup={setGroup}
            period={period}
          />
        </View>
        <View style={{ width }}>
          <ProfileScreen
            onOpenEventHistory={openEventHistory}
            onOpenAlerts={() => setActiveSheet('alerts')}
            onOpenCaptureHealth={() => setActiveSheet('captureHealth')}
            onOpenCategories={openCategories}
            onOpenData={() => setActiveSheet('data')}
            onOpenLanguage={() => setActiveSheet('language')}
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
          trend={trend}
        />
      ) : null}

      {group !== null ? (
        <MerchantDetail
          group={group}
          limit={selectedLimit}
          onClosed={handleGroupClosed}
          onEditLimit={handleEditLimit}
          period={period}
          rules={rules}
          spendWindow={spendWindow}
        />
      ) : null}

      <Modal
        animationType="slide"
        onRequestClose={() => (alertEditor === null ? setActiveSheet(null) : setAlertEditor(null))}
        onShow={() => setIsSheetPresented(true)}
        presentationStyle="pageSheet"
        visible={isSheetVisible}
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
        ) : activeSheet === 'language' ? (
          <LanguageScreen onClose={() => setActiveSheet(null)} />
        ) : activeSheet === 'privacy' ? (
          <PrivacySettingsScreen onClose={() => setActiveSheet(null)} />
        ) : activeSheet === 'events' ? (
          <EventsScreen
            events={spendingEvents.events}
            initialEventId={eventsSheetTarget}
            onClose={() => setActiveSheet(null)}
            onDelete={spendingEvents.remove}
            onEnd={spendingEvents.end}
            onSave={spendingEvents.save}
            records={countedRecords}
            rules={rules}
            showsHistory={showsEventHistory}
          />
        ) : activeSheet === 'recurring' ? (
          <SubscriptionsScreen
            hasDismissed={dismissedSubscriptions.dismissed.size > 0}
            onClose={() => setActiveSheet(null)}
            onDismiss={dismissedSubscriptions.dismiss}
            onRestoreAll={dismissedSubscriptions.restoreAll}
            payments={recurringPayments}
          />
        ) : activeSheet === 'monthlySummary' ? (
          <MonthlySummaryScreen
            events={spendingEvents.events}
            initialMonth={summaryMonthKey}
            key={summaryMonthKey ?? 'latest'}
            onClose={() => setActiveSheet(null)}
            records={countedRecords}
            recurring={recurringPayments}
            reminder={monthlySummaryReminder}
            rules={rules}
          />
        ) : activeSheet === 'forecast' ? (
          <ForecastScreen
            awaitingConversion={awaitingConversion}
            forecast={forecast}
            onClose={() => setActiveSheet(null)}
          />
        ) : activeSheet === 'captureHealth' ? (
          <CaptureHealthScreen onClose={() => setActiveSheet(null)} records={records} />
        ) : activeSheet === 'ignoredPayments' ? (
          <IgnoredPaymentsScreen
            onClose={() => setActiveSheet(null)}
            onIgnore={ignoredPayments.ignore}
            onStopIgnoring={ignoredPayments.stopIgnoring}
            records={records}
            rules={ignoredPayments.rules}
          />
        ) : activeSheet === 'categories' ? (
          <CustomCategoriesScreen
            canAssignMerchant={premium?.isPremium === true}
            canCreate={canCreateCustomCategory(hasPremiumAccess)}
            categories={customCategories.categories}
            onAssignMerchant={assignCategoryMerchant}
            onClose={() => setActiveSheet(null)}
            onCreate={customCategories.create}
            onDelete={customCategories.remove}
            onForgetMerchant={forgetMerchant}
            onRename={customCategories.rename}
            onRequirePremium={requireCategoryPremium}
            opensCreatePrompt={opensCategoryCreate && isSheetPresented}
            records={countedRecords}
            rules={rules}
          />
        ) : (
          <AlertsScreen
            entries={alertEntries}
            onClose={() => setActiveSheet(null)}
            onCreate={() => requestNewLimit({ kind: 'all' })}
            onEdit={(rule) => setAlertEditor({ scope: rule.scope, rule })}
          />
        )}
        <PrivacyShield />
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
        <PrivacyShield />
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
  navLeadingFade: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: navFadeWidth,
    experimental_backgroundImage: 'linear-gradient(to left, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 1) 100%)',
  },
  navTrailingFade: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: navFadeWidth,
    experimental_backgroundImage: 'linear-gradient(to right, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 1) 100%)',
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
    fontSize: navLabelFontSize,
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
