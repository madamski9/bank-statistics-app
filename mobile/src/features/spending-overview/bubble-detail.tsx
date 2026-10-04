import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  Easing,
  ReduceMotion,
  cancelAnimation,
  interpolate,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { AmountText } from '@/features/privacy/amount-text';
import { impactLight } from '@/haptics';
import { project, rubberband } from '@/motion';
import { useAmountFormatting } from '@/features/privacy/use-private-amounts';
import { transactionKindSymbols } from '@/features/transactions/transaction-kind-symbols';

import { BubbleSkin } from './bubble-skin';
import type { BubbleSelection } from './bubble-selection';
import {
  formatChange,
  formatShare,
  formatTransactionCount,
} from './formatting';
import { bubbleTints, overviewColors, overviewMotion, type BubbleKey } from './overview-theme';
import { periodOption, type SpendingPeriod } from './periods';
import { useCopy } from '@/features/localization/language';

import { AreaChart, type AreaSeries } from './area-chart';
import { RangeSwitcher } from './range-switcher';
import type { SpendingSource, SpendingSummary } from './spending-summary';
import { spendingOverviewCopy } from './spending-overview-copy';
import type { SpendingTrend } from './spending-trend';
import { TintedScrollView } from './tinted-scroll-view';

interface BubbleDetailProps {
  selection: BubbleSelection;
  summary: SpendingSummary;
  trend: SpendingTrend;
  change: number | null;
  period: SpendingPeriod;
  onChangePeriod: (period: SpendingPeriod) => void;
  lockedPeriods: ReadonlySet<SpendingPeriod>;
  onSelectSource: (source: SpendingSource) => void;
  onClosed: () => void;
}

const detailAmountFontSize = 44;
const horizontalPadding = 20;

function trendSeries(key: BubbleKey, trend: SpendingTrend, titles: Record<BubbleKey, string>): AreaSeries[] {
  const expense = { key: 'expense', label: titles.expense, color: bubbleTints.expense.film, values: trend.expense };
  const income = { key: 'income', label: titles.income, color: bubbleTints.income.film, values: trend.income };

  if (key === 'expense') {
    return [expense];
  }

  return key === 'income' ? [income] : [income, expense];
}

export function BubbleDetail({
  selection,
  summary,
  trend,
  change,
  period,
  onChangePeriod,
  lockedPeriods,
  onSelectSource,
  onClosed,
}: BubbleDetailProps) {
  const { formatAmount, formatSignedAmount } = useAmountFormatting();
  const copy = useCopy(spendingOverviewCopy);
  const titles = copy.titles;
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(0);
  const drag = useSharedValue(0);
  const dragContext = useSharedValue(0);
  const dismissal = useSharedValue(0);
  const closing = useSharedValue(false);
  const [contentReady, setContentReady] = useState(false);

  const { key, origin } = selection;
  const tint = bubbleTints[key];

  const coverScale = (2 * Math.hypot(width / 2, height / 2) * 1.1) / Math.max(origin.size, 1);
  const centerOffsetX = width / 2 - origin.x;
  const centerOffsetY = height / 2 - origin.y;

  useEffect(() => {
    progress.set(
      withSpring(1, { ...overviewMotion.transition, reduceMotion: ReduceMotion.System }),
    );
  }, [progress]);

  useAnimatedReaction(
    () => progress.get() > 0.25,
    (started, previous) => {
      if (started && previous !== true) {
        scheduleOnRN(setContentReady, true);
      }
    },
  );

  const requestClose = useCallback(() => {
    if (closing.get()) {
      return;
    }
    closing.set(true);
    impactLight();
    cancelAnimation(progress);
    cancelAnimation(drag);
    dismissal.set(
      withTiming(
        1,
        {
          duration: overviewMotion.exitDuration,
          easing: Easing.out(Easing.cubic),
          reduceMotion: ReduceMotion.System,
        },
        (finished) => {
          if (finished) {
            scheduleOnRN(onClosed);
          }
        },
      ),
    );
  }, [closing, dismissal, drag, onClosed, progress]);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY([-12, 12])
        .failOffsetX([-20, 20])
        .onStart(() => {
          dragContext.set(drag.get());
        })
        .onUpdate((event) => {
          if (dismissal.get() > 0) {
            return;
          }
          const next = dragContext.get() + event.translationY;

          drag.set(next >= 0 ? next : rubberband(next, height));
        })
        .onEnd((event) => {
          const projected = drag.get() + project(event.velocityY);

          if (projected > height * 0.18) {
            scheduleOnRN(requestClose);
            return;
          }

          drag.set(
            withSpring(0, {
              duration: 360,
              dampingRatio: 0.8,
              velocity: event.velocityY,
              reduceMotion: ReduceMotion.System,
            }),
          );
        })
        .onFinalize((_event, success) => {
          if (!success && dismissal.get() === 0) {
            drag.set(withSpring(0, { ...overviewMotion.dismiss, reduceMotion: ReduceMotion.System }));
          }
        }),
    [dismissal, drag, dragContext, height, requestClose],
  );

  const overlayStyle = useAnimatedStyle(() => ({
    opacity:
      (1 - dismissal.get()) *
      interpolate(drag.get(), [0, height * 0.6], [1, 0.35], Extrapolation.CLAMP),
    transform: reducedMotion
      ? []
      : [
          { translateY: drag.get() * 0.45 + dismissal.get() * 18 },
          { scale: 1 - dismissal.get() * 0.025 },
        ],
  }));

  const filmStyle = useAnimatedStyle(() => {
    const value = progress.get();

    return {
      transform: [
        { translateX: centerOffsetX * value },
        { translateY: centerOffsetY * value },
        { scaleX: interpolate(value, [0, 1], [origin.scaleX, coverScale]) },
        { scaleY: interpolate(value, [0, 1], [origin.scaleY, coverScale]) },
      ],
      opacity: interpolate(value, [0, 0.06], [0, 1], Extrapolation.CLAMP),
    };
  });

  const scrimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.get(),
      [0, 0.5],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));

  const skinStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.get(),
      [0, 0.55],
      [1, 0.1],
      Extrapolation.CLAMP,
    ),
  }));

  const contentStyle = useAnimatedStyle(() => {
    const value = progress.get();

    return {
      opacity: interpolate(value, [0.25, 0.85], [0, 1], Extrapolation.CLAMP),
      transform: [{ translateY: reducedMotion ? 0 : (1 - value) * 16 }],
    };
  });

  const option = periodOption(period);
  const amountMinor =
    key === 'expense' ? summary.expenseMinor : key === 'income' ? summary.incomeMinor : summary.netMinor;
  const amount =
    key === 'net'
      ? formatSignedAmount(summary.netMinor, summary.currency)
      : formatAmount(amountMinor, summary.currency);
  const changeIsWelcome = change === null ? true : key === 'expense' ? change < 0 : change > 0;
  const sources: SpendingSource[] = key === 'income' ? summary.incomeSources : summary.sources;

  return (
    <Animated.View
      accessibilityViewIsModal
      onAccessibilityEscape={requestClose}
      style={[StyleSheet.absoluteFill, overlayStyle]}
    >
      <Animated.View pointerEvents="none" style={[styles.scrim, scrimStyle]} />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.film,
          {
            left: origin.x - origin.size / 2,
            top: origin.y - origin.size / 2,
            width: origin.size,
            height: origin.size,
            borderRadius: origin.size / 2,
            backgroundColor: `rgba(${tint.rgb}, 0.05)`,
          },
          filmStyle,
        ]}
      >
        <Animated.View style={[styles.film, styles.skin, skinStyle]}>
          <BubbleSkin size={origin.size} tint={tint} />
        </Animated.View>
      </Animated.View>

      <Animated.View
        style={[
          styles.content,
          { paddingTop: insets.top + 6, paddingBottom: insets.bottom },
          contentStyle,
        ]}
      >
        <GestureDetector gesture={pan}>
          <Animated.View style={styles.header}>
            <View accessibilityElementsHidden importantForAccessibility="no" style={styles.handle} />
            <View style={styles.headerRow}>
              <Text maxFontSizeMultiplier={1.6} style={styles.title}>
                {titles[key]}
              </Text>
              <Pressable
                accessibilityHint={copy.closeHint}
                accessibilityLabel={copy.closeLabel(titles[key])}
                accessibilityRole="button"
                hitSlop={10}
                onPress={requestClose}
                style={({ pressed }) => [styles.closeButton, pressed ? styles.pressed : null]}
              >
                <Text maxFontSizeMultiplier={1.4} style={styles.closeLabel}>
                  {copy.close}
                </Text>
              </Pressable>
            </View>

            <View style={styles.amountBlock}>
              <AmountText
                adjustsFontSizeToFit
                maxFontSizeMultiplier={1.4}
                minimumFontScale={0.6}
                numberOfLines={1}
                style={styles.amount}
              >
                {amount}
              </AmountText>
            </View>

            <View style={styles.metaRow}>
              <AmountText maxFontSizeMultiplier={1.6} style={styles.meta}>
                {option.label}
              </AmountText>
              {change !== null ? (
                <AmountText
                  maxFontSizeMultiplier={1.6}
                  style={[
                    styles.meta,
                    styles.metaChange,
                    { color: changeIsWelcome ? overviewColors.positive : overviewColors.negative },
                  ]}
                >
                  {change >= 0 ? '▲' : '▼'} {formatChange(change)} {copy.versus} {option.previousLabel}
                </AmountText>
              ) : null}
            </View>

            <RangeSwitcher lockedPeriods={lockedPeriods} onChange={onChangePeriod} period={period} />
          </Animated.View>
        </GestureDetector>

        <TintedScrollView
          color={tint.film}
          contentContainerStyle={styles.listContent}
          style={styles.list}
        >
          {contentReady ? (
            <>
          <View style={styles.trend}>
            <AreaChart
              formatValue={(minor) => formatAmount(minor, summary.currency)}
              points={trend.points}
              series={trendSeries(key, trend, copy.titles)}
            />
          </View>
          {key === 'net' ? (
            <View style={styles.netBlock}>
              <Text maxFontSizeMultiplier={1.6} style={styles.explainer}>
                {copy.netExplainer}
              </Text>
              <NetRow
                amount={formatAmount(summary.incomeMinor, summary.currency)}
                color={overviewColors.positive}
                label={titles.income}
              />
              <NetRow
                amount={`− ${formatAmount(summary.expenseMinor, summary.currency)}`}
                color={overviewColors.negative}
                label={titles.expense}
              />
              <View style={styles.divider} />
              <NetRow
                amount={formatSignedAmount(summary.netMinor, summary.currency)}
                color={
                  summary.netMinor < 0 ? overviewColors.negative : overviewColors.positive
                }
                label={titles.net}
              />
            </View>
          ) : sources.length === 0 ? (
            <AmountText maxFontSizeMultiplier={1.6} style={styles.explainer}>
              {Platform.OS === 'ios'
                ? copy.noDataInPeriod(option.label)
                : copy.captureIosOnly}
            </AmountText>
          ) : (
            sources.map((source) => (
              <Pressable
                accessibilityHint={
                  key === 'expense' && source.group !== null
                    ? copy.sourceHint
                    : undefined
                }
                accessibilityLabel={`${source.label}, ${formatAmount(
                  source.amountMinor,
                  summary.currency,
                )}, ${formatShare(source.share)}, ${formatTransactionCount(source.count)}`}
                accessibilityRole={key === 'expense' && source.group !== null ? 'button' : 'text'}
                disabled={key !== 'expense' || source.group === null}
                key={source.key}
                onPress={() => onSelectSource(source)}
                style={({ pressed }) => [styles.sourceRow, pressed ? styles.pressed : null]}
              >
                <View style={styles.sourceIcon}>
                  <SymbolView
                    name={transactionKindSymbols[source.kind]}
                    size={17}
                    tintColor={overviewColors.textSecondary}
                  />
                </View>
                <View style={styles.sourceBody}>
                  <View style={styles.sourceHeading}>
                    <AmountText maxFontSizeMultiplier={1.6} numberOfLines={1} style={styles.sourceLabel}>
                      {source.label}
                    </AmountText>
                    <AmountText maxFontSizeMultiplier={1.6} style={styles.sourceAmount}>
                      {formatAmount(source.amountMinor, summary.currency)}
                    </AmountText>
                  </View>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          width: `${Math.max(source.share * 100, 2)}%`,
                          backgroundColor: tint.film,
                        },
                      ]}
                    />
                  </View>
                  <AmountText maxFontSizeMultiplier={1.6} style={styles.sourceMeta}>
                    {formatShare(source.share)} · {formatTransactionCount(source.count)}
                  </AmountText>
                </View>
                {key === 'expense' && source.group !== null ? (
                  <View style={styles.sourceChevron}>
                    <SymbolView
                      name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
                      size={12}
                      tintColor={overviewColors.textSecondary}
                      weight="semibold"
                    />
                  </View>
                ) : null}
              </Pressable>
            ))
          )}

          {summary.accounts.length > 0 ? (
            <Text maxFontSizeMultiplier={1.6} style={styles.footnote}>
              {copy.dataFrom(summary.accounts.join(', '))}
            </Text>
          ) : null}
            </>
          ) : null}
        </TintedScrollView>
      </Animated.View>
    </Animated.View>
  );
}

function NetRow({ label, amount, color }: { label: string; amount: string; color: string }) {
  return (
    <View accessible accessibilityLabel={`${label}: ${amount}`} style={styles.netRow}>
      <AmountText maxFontSizeMultiplier={1.6} style={styles.netLabel}>
        {label}
      </AmountText>
      <AmountText maxFontSizeMultiplier={1.6} style={[styles.netAmount, { color }]}>
        {amount}
      </AmountText>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: overviewColors.scrim,
  },
  film: {
    position: 'absolute',
  },
  skin: {
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  trend: {
    paddingBottom: 8,
  },
  content: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: horizontalPadding,
  },
  header: {
    gap: 6,
    paddingBottom: 8,
  },
  handle: {
    width: 36,
    height: 4,
    alignSelf: 'center',
    marginBottom: 10,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: overviewColors.textSecondary,
  },
  closeButton: {
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
  amountBlock: {
    alignSelf: 'flex-start',
  },
  amount: {
    fontSize: detailAmountFontSize,
    fontWeight: '700',
    letterSpacing: -1.4,
    color: overviewColors.textPrimary,
  },
  metaRow: {
    gap: 2,
    paddingBottom: 6,
  },
  meta: {
    fontSize: 13,
    color: overviewColors.textSecondary,
  },
  metaChange: {
    fontWeight: '600',
  },
  list: {
    flex: 1,
    marginHorizontal: -horizontalPadding,
  },
  listContent: {
    gap: 18,
    paddingHorizontal: horizontalPadding,
    paddingTop: 16,
    paddingBottom: 32,
  },
  netBlock: {
    gap: 14,
  },
  explainer: {
    fontSize: 14,
    lineHeight: 20,
    color: overviewColors.textSecondary,
  },
  netRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  netLabel: {
    fontSize: 15,
    color: overviewColors.textPrimary,
  },
  netAmount: {
    fontSize: 17,
    fontWeight: '600',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: overviewColors.hairline,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  sourceIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: overviewColors.hairline,
    backgroundColor: overviewColors.surface,
  },
  sourceBody: {
    flex: 1,
    gap: 6,
  },
  sourceChevron: {
    height: 20,
    justifyContent: 'center',
  },
  sourceHeading: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  sourceLabel: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '500',
    color: overviewColors.textPrimary,
  },
  sourceAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: overviewColors.textPrimary,
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
  },
  sourceMeta: {
    fontSize: 12,
    color: overviewColors.textSecondary,
  },
  footnote: {
    fontSize: 12,
    lineHeight: 17,
    color: overviewColors.textSecondary,
  },
});
