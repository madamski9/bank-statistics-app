import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SymbolView } from 'expo-symbols';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  ReduceMotion,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import type { CategorizationRule } from '@/features/classification/categorization-rule';
import type { SpendingGroup } from '@/features/classification/spending-groups';
import type { GroupLimit } from '@/features/alerts/group-limit';
import { LimitProgressBar } from '@/features/alerts/limit-progress-bar';
import { useAmountFormatting } from '@/features/privacy/use-private-amounts';
import { formatShare } from '@/features/spending-overview/formatting';
import { overviewColors, overviewSpacing } from '@/features/spending-overview/overview-theme';
import { periodOption, type PeriodWindow, type SpendingPeriod } from '@/features/spending-overview/periods';
import { formatDayHeading, formatTime } from '@/features/transactions/format-date';
import { impactLight } from '@/haptics';
import { project, rubberband } from '@/motion';
import { useCopy } from '@/features/localization/language';

import { categoryBreakdown, transactionParty } from './category-breakdown';
import { merchantsCopy } from './merchants-copy';
import { DailySpendChart } from './daily-spend-chart';
import { transactionCount } from './group-counts';
import { bucketSizeFor, bucketSpending, earliestOccurredMs } from './merchant-summary';

interface MerchantDetailProps {
  group: SpendingGroup;
  rules: CategorizationRule[];
  limit: GroupLimit | null;
  onEditLimit: () => void;
  spendWindow: PeriodWindow;
  period: SpendingPeriod;
  /** Called once the sheet has finished leaving, so it can unmount. */
  onClosed: () => void;
}

export function MerchantDetail({
  group,
  rules,
  limit,
  onEditLimit,
  spendWindow,
  period,
  onClosed,
}: MerchantDetailProps) {
  const { formatAmount } = useAmountFormatting();
  const copy = useCopy(merchantsCopy);
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(height);
  const dragContext = useSharedValue(0);
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);

  const buckets = useMemo(
    () =>
      bucketSpending(
        group.records,
        spendWindow,
        bucketSizeFor(period, earliestOccurredMs(group.records), spendWindow.endMs),
      ),
    [group.records, period, spendWindow],
  );

  const isCategory = group.dimension === 'category';
  const breakdown = useMemo(
    () => (isCategory ? categoryBreakdown(group.records, rules) : []),
    [group.records, isCategory, rules],
  );

  useEffect(() => {
    translateY.set(
      withSpring(0, { duration: 420, dampingRatio: 0.88, reduceMotion: ReduceMotion.System }),
    );
  }, [translateY]);

  const requestClose = useCallback(() => {
    impactLight();
    translateY.set(
      withSpring(
        height,
        {
          duration: 320,
          dampingRatio: 1,
          overshootClamping: true,
          reduceMotion: ReduceMotion.System,
        },
        (finished) => {
          if (finished) {
            scheduleOnRN(onClosed);
          }
        },
      ),
    );
  }, [height, onClosed, translateY]);

  /** On the header only, so the history below keeps its own scrolling. */
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY([-12, 12])
        .onStart(() => {
          dragContext.set(translateY.get());
        })
        .onUpdate((event) => {
          const next = dragContext.get() + event.translationY;

          translateY.set(next >= 0 ? next : rubberband(next, height));
        })
        .onEnd((event) => {
          const projected = translateY.get() + project(event.velocityY);

          if (projected > height * 0.25) {
            scheduleOnRN(requestClose);
            return;
          }

          translateY.set(
            withSpring(0, {
              duration: 360,
              dampingRatio: 0.8,
              velocity: event.velocityY,
              reduceMotion: ReduceMotion.System,
            }),
          );
        }),
    [dragContext, height, requestClose, translateY],
  );

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.get() }],
  }));
  const scrimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateY.get(), [0, height], [1, 0], Extrapolation.CLAMP),
  }));

  const option = periodOption(period);

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <Animated.View pointerEvents="none" style={[styles.scrim, scrimStyle]} />
      <Animated.View
        style={[styles.sheet, { paddingTop: insets.top + 6 }, sheetStyle]}
      >
        <GestureDetector gesture={pan}>
          <Animated.View style={styles.header}>
            <View accessibilityElementsHidden importantForAccessibility="no" style={styles.handle} />
            <View style={styles.titleRow}>
              <View style={styles.titleBlock}>
                <Text maxFontSizeMultiplier={1.5} numberOfLines={1} style={styles.title}>
                  {group.name}
                </Text>
                {group.subtitle !== undefined ? (
                  <Text maxFontSizeMultiplier={1.5} numberOfLines={1} style={styles.location}>
                    {group.subtitle}
                  </Text>
                ) : null}
              </View>
              <Pressable
                accessibilityHint={copy.backHint}
                accessibilityLabel={copy.closeLabel(group.name)}
                accessibilityRole="button"
                hitSlop={10}
                onPress={requestClose}
                style={({ pressed }) => [styles.close, pressed ? styles.pressed : null]}
              >
                <Text maxFontSizeMultiplier={1.4} style={styles.closeLabel}>
                  {copy.close}
                </Text>
              </Pressable>
            </View>

            <Text
              adjustsFontSizeToFit
              maxFontSizeMultiplier={1.4}
              minimumFontScale={0.6}
              numberOfLines={1}
              style={styles.total}
            >
              {formatAmount(group.totalMinor, group.currency)}
            </Text>
            <Text maxFontSizeMultiplier={1.5} style={styles.meta}>
              {option.label} · {transactionCount(group.count, group.dimension)} · {copy.average}{' '}
              {formatAmount(group.averageMinor, group.currency)} ·{' '}
              {copy.shareOfSpending(formatShare(group.share))}
            </Text>
          </Animated.View>
        </GestureDetector>

        <ScrollView
          contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 32 }]}
          indicatorStyle="white"
        >
          {limit !== null ? (
            <Pressable
              accessibilityHint={copy.limitHint}
              accessibilityLabel={`${copy.limitTitle(limit.periodLabel)}, ${copy.limitProgress(formatAmount(limit.amountMinor, limit.currency), formatAmount(limit.targetMinor, limit.currency))}`}
              accessibilityRole="button"
              onPress={onEditLimit}
              style={({ pressed }) => [styles.limit, pressed ? styles.pressed : null]}
            >
              <View style={styles.limitHeading}>
                <Text maxFontSizeMultiplier={1.5} style={styles.limitLabel}>
                  {copy.limitTitle(limit.periodLabel)}
                </Text>
                <View style={styles.limitValue}>
                  <Text maxFontSizeMultiplier={1.5} style={styles.limitAmount}>
                    <Text
                      style={[
                        styles.limitSpent,
                        limit.share >= 1 ? styles.limitSpentExceeded : null,
                      ]}
                    >
                      {formatAmount(limit.amountMinor, limit.currency)}
                    </Text>{' '}
                    {copy.of} {formatAmount(limit.targetMinor, limit.currency)}
                  </Text>
                  <SymbolView
                    name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
                    size={12}
                    tintColor={overviewColors.textSecondary}
                    weight="semibold"
                  />
                </View>
              </View>
              <LimitProgressBar share={limit.share} />
            </Pressable>
          ) : group.records.some((record) => record.currency === 'PLN') ? (
            <Pressable
              accessibilityHint={copy.setLimitHint}
              accessibilityLabel={copy.setLimit}
              accessibilityRole="button"
              hitSlop={{ top: 6, bottom: 6, left: 8, right: 8 }}
              onPress={onEditLimit}
              style={({ pressed }) => [styles.limitAction, pressed ? styles.pressed : null]}
            >
              <SymbolView
                name={{ ios: 'plus', android: 'add', web: 'add' }}
                size={12}
                tintColor={overviewColors.textPrimary}
                weight="semibold"
              />
              <Text maxFontSizeMultiplier={1.3} style={styles.limitActionLabel}>
                {copy.setLimit}
              </Text>
            </Pressable>
          ) : null}

          {buckets.length > 0 ? (
            <DailySpendChart
              buckets={buckets}
              currency={group.currency}
              onSelect={setSelectedBucket}
              selectedKey={selectedBucket}
            />
          ) : null}

          {breakdown.length > 0 ? (
            <View style={styles.breakdown}>
              <Text maxFontSizeMultiplier={1.5} style={styles.historyTitle}>
                {copy.spentOn}
              </Text>
              {breakdown.map((entry) => (
                <View
                  accessible
                  accessibilityLabel={`${entry.label}, ${formatAmount(entry.amountMinor, group.currency)}, ${formatShare(entry.share)}, ${transactionCount(entry.count, 'category')}`}
                  key={entry.key}
                  style={styles.breakdownRow}
                >
                  <View style={styles.breakdownHeading}>
                    <Text maxFontSizeMultiplier={1.5} numberOfLines={1} style={styles.breakdownLabel}>
                      {entry.label}
                    </Text>
                    <Text maxFontSizeMultiplier={1.5} style={styles.historyAmount}>
                      {formatAmount(entry.amountMinor, group.currency)}
                    </Text>
                  </View>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${Math.max(entry.share * 100, 2)}%` }]} />
                  </View>
                  <Text maxFontSizeMultiplier={1.5} style={styles.breakdownMeta}>
                    {formatShare(entry.share)} · {transactionCount(entry.count, 'category')}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.history}>
            <Text maxFontSizeMultiplier={1.5} style={styles.historyTitle}>
              {copy.history}
            </Text>
            {group.records.map((record) => {
              const occurredAt = new Date(record.occurredAt);
              const party = isCategory ? transactionParty(record, rules) : null;

              return (
                <View
                  accessible
                  accessibilityLabel={`${party === null ? '' : `${party}, `}${formatDayHeading(occurredAt, new Date())}, ${formatTime(occurredAt)}, ${formatAmount(record.amountMinor, record.currency)}`}
                  key={record.id}
                  style={styles.historyRow}
                >
                  <View style={styles.historyCopy}>
                    {party !== null ? (
                      <Text maxFontSizeMultiplier={1.5} numberOfLines={1} style={styles.historyParty}>
                        {party}
                      </Text>
                    ) : null}
                    <Text
                      maxFontSizeMultiplier={1.5}
                      style={party === null ? styles.historyDate : styles.historyTime}
                    >
                      {formatDayHeading(occurredAt, new Date())}
                      <Text style={styles.historyTime}> · {formatTime(occurredAt)}</Text>
                    </Text>
                  </View>
                  <Text maxFontSizeMultiplier={1.5} style={styles.historyAmount}>
                    − {formatAmount(record.amountMinor, record.currency)}
                  </Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  limit: {
    gap: 10,
    paddingVertical: 4,
  },
  limitHeading: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  limitLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: overviewColors.textPrimary,
  },
  limitValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  limitAmount: {
    fontSize: 14,
    color: overviewColors.textSecondary,
  },
  limitSpent: {
    fontWeight: '600',
    color: overviewColors.textPrimary,
  },
  limitSpentExceeded: {
    color: overviewColors.negative,
  },
  limitAction: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    minHeight: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: overviewColors.hairline,
    backgroundColor: overviewColors.surfacePressed,
  },
  limitActionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: overviewColors.textPrimary,
  },
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: overviewColors.scrim,
  },
  sheet: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: overviewColors.background,
  },
  header: {
    gap: 6,
    paddingHorizontal: overviewSpacing.gutter,
    paddingBottom: overviewSpacing.row,
  },
  handle: {
    width: 36,
    height: 4,
    alignSelf: 'center',
    marginBottom: 10,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  titleBlock: {
    flexShrink: 1,
    gap: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.4,
    color: overviewColors.textPrimary,
  },
  location: {
    fontSize: 13,
    color: overviewColors.textSecondary,
  },
  close: {
    minHeight: 44,
    justifyContent: 'center',
    paddingLeft: 12,
  },
  closeLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: overviewColors.textPrimary,
  },
  pressed: {
    opacity: 0.6,
  },
  total: {
    fontSize: 38,
    fontWeight: '700',
    letterSpacing: -1.2,
    color: overviewColors.textPrimary,
  },
  meta: {
    fontSize: 13,
    lineHeight: 18,
    color: overviewColors.textSecondary,
  },
  body: {
    gap: overviewSpacing.section,
    paddingHorizontal: overviewSpacing.gutter,
    paddingTop: overviewSpacing.tight,
  },
  history: {
    gap: 2,
  },
  breakdown: {
    gap: 14,
  },
  breakdownRow: {
    gap: 6,
  },
  breakdownHeading: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  breakdownLabel: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '500',
    color: overviewColors.textPrimary,
  },
  breakdownMeta: {
    fontSize: 12,
    color: overviewColors.textSecondary,
  },
  barTrack: {
    height: 5,
    overflow: 'hidden',
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: overviewColors.textSecondary,
  },
  historyCopy: {
    flexShrink: 1,
    gap: 2,
  },
  historyParty: {
    fontSize: 15,
    fontWeight: '500',
    color: overviewColors.textPrimary,
  },
  historyTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
    color: overviewColors.textPrimary,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: overviewColors.hairline,
  },
  historyDate: {
    fontSize: 15,
    color: overviewColors.textPrimary,
  },
  historyTime: {
    fontSize: 13,
    color: overviewColors.textSecondary,
  },
  historyAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: overviewColors.textPrimary,
  },
});
