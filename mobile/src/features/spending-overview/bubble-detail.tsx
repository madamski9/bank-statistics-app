import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
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

import { impactLight } from '@/haptics';
import { project, rubberband } from '@/motion';

import { BubbleSkin } from './bubble-skin';
import type { BubbleSelection } from './bubble-selection';
import {
  formatAmount,
  formatChange,
  formatShare,
  formatSignedAmount,
  formatTransactionCount,
} from './formatting';
import { bubbleTints, overviewColors, overviewMotion, type BubbleKey } from './overview-theme';
import { periodOption, type SpendingPeriod } from './periods';
import { RangeSwitcher } from './range-switcher';
import type { SpendingSource, SpendingSourceKind, SpendingSummary } from './spending-summary';

interface BubbleDetailProps {
  selection: BubbleSelection;
  summary: SpendingSummary;
  change: number | null;
  period: SpendingPeriod;
  onChangePeriod: (period: SpendingPeriod) => void;
  onClosed: () => void;
}

const detailAmountFontSize = 44;
const horizontalPadding = 20;

const sourceSymbols = {
  cardPayment: { ios: 'creditcard.fill', android: 'credit_card', web: 'credit_card' },
  outgoingTransfer: { ios: 'arrow.up.forward', android: 'arrow_outward', web: 'arrow_outward' },
  incomingTransfer: {
    ios: 'arrow.down.backward',
    android: 'arrow_downward',
    web: 'arrow_downward',
  },
  other: { ios: 'square.grid.2x2.fill', android: 'grid_view', web: 'grid_view' },
} as const satisfies Record<SpendingSourceKind, { ios: string; android: string; web: string }>;

const titles: Record<BubbleKey, string> = {
  expense: 'Wydatki',
  income: 'Przychody',
  net: 'Przepływ',
};

export function BubbleDetail({
  selection,
  summary,
  change,
  period,
  onChangePeriod,
  onClosed,
}: BubbleDetailProps) {
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

  /** Expand past the farthest corner so the film leaves the viewport entirely. */
  const coverScale = (2 * Math.hypot(width / 2, height / 2) * 1.1) / Math.max(origin.size, 1);
  const centerOffsetX = width / 2 - origin.x;
  const centerOffsetY = height / 2 - origin.y;

  useEffect(() => {
    progress.set(
      withSpring(1, { ...overviewMotion.transition, reduceMotion: ReduceMotion.System }),
    );
  }, [progress]);

  /**
   * The breakdown is the expensive half of this screen — a list, its icons and the switcher.
   * Mounting it in the same frame as the tap is what made the transition hitch, so it waits
   * until the expansion is visibly under way and then fades in where it always did.
   */
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

  /** Attached to the header only, so the breakdown list keeps its own scroll gesture. */
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

  /**
   * Rim and highlights belong to a bubble, not to a full-screen surface: scaled up they turn
   * into a glare that eats the header text, so they fade out as the film swallows the screen.
   */
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
  /** For expenses, spending more than last period is the unwelcome direction. */
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
            /** Once expanded this faint disc is what tints the whole detail. */
            backgroundColor: `rgba(${tint.rgb}, 0.05)`,
          },
          filmStyle,
        ]}
      >
        <Animated.View style={[styles.film, styles.skin, skinStyle]}>
          <BubbleSkin size={origin.size} tint={key} />
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
                accessibilityHint="Zamyka szczegóły"
                accessibilityLabel={`Zamknij szczegóły: ${titles[key]}`}
                accessibilityRole="button"
                hitSlop={10}
                onPress={requestClose}
                style={({ pressed }) => [styles.closeButton, pressed ? styles.pressed : null]}
              >
                <Text maxFontSizeMultiplier={1.4} style={styles.closeLabel}>
                  Zamknij
                </Text>
              </Pressable>
            </View>

            <View style={styles.amountBlock}>
              <Text
                adjustsFontSizeToFit
                maxFontSizeMultiplier={1.4}
                minimumFontScale={0.6}
                numberOfLines={1}
                style={styles.amount}
              >
                {amount}
              </Text>
            </View>

            <View style={styles.metaRow}>
              <Text maxFontSizeMultiplier={1.6} style={styles.meta}>
                {option.label}
              </Text>
              {change !== null ? (
                <Text
                  maxFontSizeMultiplier={1.6}
                  style={[
                    styles.meta,
                    styles.metaChange,
                    { color: changeIsWelcome ? overviewColors.positive : overviewColors.negative },
                  ]}
                >
                  {change >= 0 ? '▲' : '▼'} {formatChange(change)} vs {option.previousLabel}
                </Text>
              ) : null}
            </View>

            <RangeSwitcher onChange={onChangePeriod} period={period} />
          </Animated.View>
        </GestureDetector>

        <ScrollView
          contentContainerStyle={styles.listContent}
          indicatorStyle="white"
          style={styles.list}
        >
          {contentReady ? (
            <>
          {key === 'net' ? (
            <View style={styles.netBlock}>
              <Text maxFontSizeMultiplier={1.6} style={styles.explainer}>
                Przepływ to przychody minus wydatki w wybranym okresie. To nie jest saldo konta.
              </Text>
              <NetRow
                amount={formatAmount(summary.incomeMinor, summary.currency)}
                color={overviewColors.positive}
                label="Przychody"
              />
              <NetRow
                amount={`− ${formatAmount(summary.expenseMinor, summary.currency)}`}
                color={overviewColors.negative}
                label="Wydatki"
              />
              <View style={styles.divider} />
              <NetRow
                amount={formatSignedAmount(summary.netMinor, summary.currency)}
                color={
                  summary.netMinor < 0 ? overviewColors.negative : overviewColors.positive
                }
                label="Przepływ"
              />
            </View>
          ) : sources.length === 0 ? (
            <Text maxFontSizeMultiplier={1.6} style={styles.explainer}>
              {Platform.OS === 'ios'
                ? `Brak danych w okresie „${option.label}”. Wybierz Max, aby zobaczyć wszystko, co udało się przechwycić.`
                : 'Przechwytywanie powiadomień działa na razie tylko na iOS.'}
            </Text>
          ) : (
            sources.map((source) => (
              <View
                accessible
                accessibilityLabel={`${source.label}, ${formatAmount(
                  source.amountMinor,
                  summary.currency,
                )}, ${formatShare(source.share)}, ${formatTransactionCount(source.count)}`}
                key={source.key}
                style={styles.sourceRow}
              >
                <View style={styles.sourceIcon}>
                  <SymbolView
                    name={sourceSymbols[source.kind]}
                    size={17}
                    tintColor={overviewColors.textSecondary}
                  />
                </View>
                <View style={styles.sourceBody}>
                  <View style={styles.sourceHeading}>
                    <Text maxFontSizeMultiplier={1.6} numberOfLines={1} style={styles.sourceLabel}>
                      {source.label}
                    </Text>
                    <Text maxFontSizeMultiplier={1.6} style={styles.sourceAmount}>
                      {formatAmount(source.amountMinor, summary.currency)}
                    </Text>
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
                  <Text maxFontSizeMultiplier={1.6} style={styles.sourceMeta}>
                    {formatShare(source.share)} · {formatTransactionCount(source.count)}
                  </Text>
                </View>
              </View>
            ))
          )}

          {summary.accounts.length > 0 ? (
            <Text maxFontSizeMultiplier={1.6} style={styles.footnote}>
              Dane z: {summary.accounts.join(', ')}
            </Text>
          ) : null}
            </>
          ) : null}
        </ScrollView>
      </Animated.View>
    </Animated.View>
  );
}

function NetRow({ label, amount, color }: { label: string; amount: string; color: string }) {
  return (
    <View accessible accessibilityLabel={`${label}: ${amount}`} style={styles.netRow}>
      <Text maxFontSizeMultiplier={1.6} style={styles.netLabel}>
        {label}
      </Text>
      <Text maxFontSizeMultiplier={1.6} style={[styles.netAmount, { color }]}>
        {amount}
      </Text>
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
  },
  listContent: {
    gap: 18,
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
