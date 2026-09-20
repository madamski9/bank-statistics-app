import { useUser } from '@clerk/expo';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OverviewScreen } from '@/features/overview/overview-screen';
import { BubbleDetail, type BubbleSelection } from '@/features/spending-overview/bubble-detail';
import { overviewColors, overviewSpacing } from '@/features/spending-overview/overview-theme';
import {
  periodWindow,
  previousPeriodWindow,
  type SpendingPeriod,
} from '@/features/spending-overview/periods';
import { periodChange, summarizeSpending } from '@/features/spending-overview/spending-summary';
import { useCapturedSpending } from '@/features/spending-overview/use-captured-spending';
import { TransactionsScreen } from '@/features/transactions/transactions-screen';

const pages = [
  { key: 'overview', label: 'Przegląd' },
  { key: 'transactions', label: 'Transakcje' },
] as const;

type PageKey = (typeof pages)[number]['key'];

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
  const [selection, setSelection] = useState<BubbleSelection | null>(null);
  const { error, isLoading, records } = useCapturedSpending();

  /** The rolling windows are re-anchored to "now" on every data or range change. */
  const summary = useMemo(
    () => summarizeSpending(records, periodWindow(period, new Date())),
    [period, records],
  );
  const previousSummary = useMemo(() => {
    const window = previousPeriodWindow(period, new Date());

    return window === null ? null : summarizeSpending(records, window);
  }, [period, records]);

  const pageIndex = page === 'overview' ? 0 : 1;
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

  const goToPage = (next: PageKey) => {
    setPage(next);
    pagerRef.current?.scrollTo({ x: (next === 'overview' ? 0 : 1) * width, animated: true });
  };

  /**
   * Fires per frame, but only ever calls setState when the pager crosses the halfway mark, so
   * the tab label tracks the finger at the cost of one render per page change.
   */
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next: PageKey =
      event.nativeEvent.contentOffset.x > width / 2 ? 'transactions' : 'overview';

    if (next !== page) {
      setPage(next);
    }
  };

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

  const initial = (user?.firstName ?? user?.primaryEmailAddress?.emailAddress ?? '?')
    .slice(0, 1)
    .toUpperCase();

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />

      <View accessibilityRole="tablist" style={[styles.nav, { paddingTop: insets.top + 12 }]}>
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
                style={[styles.navLabel, isActive ? styles.navLabelActive : null]}
              >
                {entry.label}
              </Text>
            </Pressable>
          );
        })}
        <View style={styles.navSpacer} />
        <View
          accessibilityLabel={user?.firstName ? `Konto: ${user.firstName}` : 'Konto'}
          accessible
          style={styles.avatar}
        >
          <Text maxFontSizeMultiplier={1.3} style={styles.avatarInitial}>
            {initial}
          </Text>
        </View>
      </View>

      <ScrollView
        horizontal
        onScroll={handleScroll}
        pagingEnabled
        ref={pagerRef}
        scrollEnabled={selection === null}
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
            onSelectBubble={(key, origin) => setSelection({ key, origin })}
            period={period}
            summary={summary}
          />
        </View>
        <View style={{ width }}>
          <TransactionsScreen error={error} isLoading={isLoading} records={records} />
        </View>
      </ScrollView>

      {selection !== null ? (
        <BubbleDetail
          change={selectedChange}
          onChangePeriod={setPeriod}
          onClosed={() => setSelection(null)}
          period={period}
          selection={selection}
          summary={summary}
        />
      ) : null}
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
  navSpacer: {
    flex: 1,
  },
  avatar: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    backgroundColor: overviewColors.surfacePressed,
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
