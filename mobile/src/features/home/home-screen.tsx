import { useUser } from '@clerk/expo';
import { Image } from 'expo-image';
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
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { alertProgress } from '@/features/alerts/alert-evaluation';
import { AlertRuleSheet } from '@/features/alerts/alert-rule-sheet';
import type { AlertRule, AlertScope } from '@/features/alerts/alert-rule';
import { AlertsScreen } from '@/features/alerts/alerts-screen';
import { requestAlertPermission } from '@/features/alerts/expo-alert-notifier';
import { groupLimit, ruleForScope, scopeForGroup } from '@/features/alerts/group-limit';
import { useAlerts } from '@/features/alerts/use-alerts';
import {
  groupSpending,
  type SpendingDimension,
  type SpendingGroup,
} from '@/features/classification/spending-groups';
import { useCategorizationRules } from '@/features/classification/use-categorization-rules';
import { accountInitial } from '@/features/profile/account-identity';
import { IngestionDiagnosticsCard } from '@/features/ingestion-diagnostics/ingestion-diagnostics-card';
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
import { periodChange, summarizeSpending } from '@/features/spending-overview/spending-summary';
import { useCapturedSpending } from '@/features/spending-overview/use-captured-spending';
import { MerchantDetail } from '@/features/merchants/merchant-detail';
import { MerchantsScreen } from '@/features/merchants/merchants-screen';
import { ProfileScreen } from '@/features/profile/profile-screen';
import { affectsStatistics } from '@/features/transactions/transaction-record';
import { TransactionsScreen } from '@/features/transactions/transactions-screen';

const pages = [
  { key: 'overview', label: 'Przegląd' },
  { key: 'transactions', label: 'Transakcje' },
  { key: 'merchants', label: 'Sklepy' },
] as const;

type PageKey = (typeof pages)[number]['key'];
type SheetKey = 'profile' | 'diagnostics' | 'alerts';

interface AlertEditor {
  scope: AlertScope;
  rule: AlertRule | null;
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
  const [period, setPeriod] = useState<SpendingPeriod>('month');
  const [{ selection, revision }, dispatchSelection] = useReducer(
    bubbleSelectionReducer,
    initialBubbleSelection,
  );
  const [group, setGroup] = useState<SpendingGroup | null>(null);
  const [dimension, setDimension] = useState<SpendingDimension>('merchant');
  const [activeSheet, setActiveSheet] = useState<SheetKey | null>(null);
  const [titleOffsets, setTitleOffsets] = useState<Partial<Record<PageKey, number>>>({});
  const navOffset = useSharedValue(0);
  const { error, isLoading, records, refresh } = useCapturedSpending();
  const { remember, rules } = useCategorizationRules();
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

  const handleEditLimit = useCallback(() => {
    if (group === null) {
      return;
    }

    const scope = scopeForGroup(group);

    setAlertEditor({ scope, rule: ruleForScope(alerts.rules, scope) });
  }, [alerts.rules, group]);

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

  const pageIndex = Math.max(
    pages.findIndex((entry) => entry.key === page),
    0,
  );
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
        x: Math.max(pages.findIndex((entry) => entry.key === next), 0) * width,
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

  const handleGroupClosed = useCallback(() => {
    setGroup(null);
  }, []);

  /**
   * Three titles at this size do not fit a phone, so the row slides instead of shrinking: the
   * active one sits in the gutter and its neighbours stay half-visible as an affordance.
   */
  useEffect(() => {
    const offset = titleOffsets[page];

    if (offset === undefined) {
      return;
    }

    navOffset.set(
      withSpring(-offset, { duration: 420, dampingRatio: 0.9, reduceMotion: ReduceMotion.System }),
    );
  }, [navOffset, page, titleOffsets]);

  /**
   * Fires per frame, but only ever calls setState when the pager crosses the halfway mark, so
   * the tab label tracks the finger at the cost of one render per page change.
   */
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.min(
      Math.max(Math.round(event.nativeEvent.contentOffset.x / Math.max(width, 1)), 0),
      pages.length - 1,
    );
    const next = pages[index].key;

    if (next !== page) {
      setPage(next);
    }
  };

  const navStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: navOffset.get() }],
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
        <View accessibilityRole="tablist" style={styles.navViewport}>
          <Animated.View style={[styles.navRow, navStyle]}>
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
                    {entry.label}
                  </Text>
                </Pressable>
              );
            })}
          </Animated.View>
        </View>
        <Pressable
          accessibilityHint="Otwiera profil i ustawienia konta"
          accessibilityLabel={user?.firstName ? `Konto: ${user.firstName}` : 'Konto'}
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => setActiveSheet('profile')}
          style={({ pressed }) => [styles.avatar, pressed ? styles.pressed : null]}
        >
          {user?.imageUrl ? (
            <Image accessible={false} contentFit="cover" source={user.imageUrl} style={styles.avatarImage} />
          ) : (
            <Text maxFontSizeMultiplier={1.3} style={styles.avatarInitial}>
              {initial}
            </Text>
          )}
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
            onChangePeriod={setPeriod}
            onSelectBubble={handleSelectBubble}
            period={period}
            summary={summary}
          />
        </View>
        <View style={{ width }}>
          <TransactionsScreen
            error={error}
            isLoading={isLoading}
            onChanged={refresh}
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
            onChangePeriod={setPeriod}
            onSelectGroup={setGroup}
            period={period}
          />
        </View>
      </ScrollView>

      {selection !== null ? (
        <BubbleDetail
          change={selectedChange}
          key={revision}
          onChangePeriod={setPeriod}
          onClosed={handleDetailClosed}
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
        onRequestClose={() => setAlertEditor(null)}
        presentationStyle="pageSheet"
        visible={alertEditor !== null}
      >
        {alertEditor !== null ? (
          <AlertRuleSheet
            isFirstRule={alerts.rules.length === 0}
            onCancel={() => setAlertEditor(null)}
            onDelete={alertEditor.rule === null ? undefined : handleDeleteAlert}
            onRequestPermission={requestAlertPermission}
            onSave={handleSaveAlert}
            rule={alertEditor.rule}
            scope={alertEditor.scope}
          />
        ) : null}
      </Modal>

      <Modal
        animationType="slide"
        onRequestClose={() => setActiveSheet(null)}
        presentationStyle="pageSheet"
        visible={activeSheet !== null}
      >
        {activeSheet === 'profile' ? (
          <ProfileScreen
            onClose={() => setActiveSheet(null)}
            onOpenAlerts={() => setActiveSheet('alerts')}
            onOpenDiagnostics={() => setActiveSheet('diagnostics')}
          />
        ) : activeSheet === 'alerts' ? (
          <AlertsScreen
            entries={alertEntries}
            onClose={() => setActiveSheet(null)}
            onCreate={() => setAlertEditor({ scope: { kind: 'all' }, rule: null })}
            onEdit={(rule) => setAlertEditor({ scope: rule.scope, rule })}
          />
        ) : (
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text maxFontSizeMultiplier={1.4} style={styles.sheetTitle}>
                Diagnostyka
              </Text>
              <Pressable
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => setActiveSheet(null)}
                style={({ pressed }) => [styles.sheetClose, pressed ? styles.pressed : null]}
              >
                <Text maxFontSizeMultiplier={1.3} style={styles.sheetCloseLabel}>
                  Gotowe
                </Text>
              </Pressable>
            </View>
            <IngestionDiagnosticsCard />
          </View>
        )}
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  navTab: {
    minHeight: 44,
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
  navLabel: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.8,
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
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarInitial: {
    fontSize: 15,
    fontWeight: '600',
    color: overviewColors.textPrimary,
  },
  sheet: {
    flex: 1,
    gap: overviewSpacing.tight,
    paddingHorizontal: overviewSpacing.gutter,
    paddingTop: overviewSpacing.gutter,
    backgroundColor: overviewColors.background,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetTitle: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.6,
    color: overviewColors.textPrimary,
  },
  sheetClose: {
    minHeight: 44,
    justifyContent: 'center',
  },
  sheetCloseLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: overviewColors.textSecondary,
  },
  pager: {
    flex: 1,
  },
});
