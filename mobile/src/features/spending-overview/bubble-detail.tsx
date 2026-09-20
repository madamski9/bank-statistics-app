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
  type LayoutChangeEvent,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  ReduceMotion,
  interpolate,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { impactLight } from '@/haptics';

import { BubbleSkin } from './bubble-skin';
import {
  formatAmount,
  formatChange,
  formatShare,
  formatSignedAmount,
  formatTransactionCount,
} from './formatting';
import type { BubbleOrigin } from './glass-bubble';
import { bubbleTints, overviewColors, overviewMotion, type BubbleKey } from './overview-theme';
import { periodOption, type SpendingPeriod } from './periods';
import { RangeSwitcher } from './range-switcher';
import type { SpendingSource, SpendingSourceKind, SpendingSummary } from './spending-summary';

export interface BubbleSelection {
  key: BubbleKey;
  origin: BubbleOrigin;
}

interface BubbleDetailProps {
  selection: BubbleSelection;
  summary: SpendingSummary;
  change: number | null;
  period: SpendingPeriod;
  onChangePeriod: (period: SpendingPeriod) => void;
  /** Called once the collapse animation has finished, so the overlay can unmount. */
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

function project(velocity: number, decelerationRate = 0.998): number {
  'worklet';

  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

function rubberband(overshoot: number, dimension: number, constant = 0.55): number {
  'worklet';

  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

/** Dragging down unwinds the same value the expansion runs on, so the gesture reverses it. */
function effectiveProgress(openness: number, dragged: number, viewportHeight: number): number {
  'worklet';

  return (
    openness *
    (1 - interpolate(dragged, [0, viewportHeight * 0.6], [0, 0.85], Extrapolation.CLAMP))
  );
}

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
  /** Starts where the tapped bubble's rebound left it, so the film takes over without a jump. */
  const pop = useSharedValue(1.11);
  const [contentReady, setContentReady] = useState(false);
  const [amountAnchor, setAmountAnchor] = useState<{ x: number; y: number; scale: number } | null>(
    null,
  );

  const { key, origin } = selection;
  const tint = bubbleTints[key];

  /** Expand past the farthest corner so the film leaves the viewport entirely. */
  const coverScale = (2 * Math.hypot(width / 2, height / 2) * 1.1) / Math.max(origin.size, 1);
  const centerOffsetX = width / 2 - origin.x;
  const centerOffsetY = height / 2 - origin.y;

  useEffect(() => {
    progress.set(
      withDelay(
        reducedMotion ? 0 : 60,
        withSpring(1, { ...overviewMotion.transition, reduceMotion: ReduceMotion.System }),
      ),
    );
    pop.set(withSpring(1, { ...overviewMotion.settle, reduceMotion: ReduceMotion.System }));
  }, [pop, progress, reducedMotion]);

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
    impactLight();
    drag.set(withSpring(0, overviewMotion.dismiss));
    progress.set(
      withSpring(0, { ...overviewMotion.dismiss, reduceMotion: ReduceMotion.System }, (finished) => {
        if (finished) {
          scheduleOnRN(onClosed);
        }
      }),
    );
  }, [drag, onClosed, progress]);

  /** Attached to the header only, so the breakdown list keeps its own scroll gesture. */
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY([-12, 12])
        .onStart(() => {
          dragContext.set(drag.get());
        })
        .onUpdate((event) => {
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
        }),
    [drag, dragContext, height, requestClose],
  );

  const filmStyle = useAnimatedStyle(() => {
    const value = effectiveProgress(progress.get(), drag.get(), height);

    return {
      transform: [
        { translateX: centerOffsetX * value },
        { translateY: centerOffsetY * value + drag.get() * 0.25 },
        { scale: (1 + (coverScale - 1) * value) * pop.get() },
      ],
      opacity: interpolate(value, [0, 0.06], [0, 1], Extrapolation.CLAMP),
    };
  });

  const scrimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      effectiveProgress(progress.get(), drag.get(), height),
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
      effectiveProgress(progress.get(), drag.get(), height),
      [0, 0.55],
      [1, 0.1],
      Extrapolation.CLAMP,
    ),
  }));

  const contentStyle = useAnimatedStyle(() => {
    const value = effectiveProgress(progress.get(), drag.get(), height);

    return {
      opacity: interpolate(value, [0.45, 0.95], [0, 1], Extrapolation.CLAMP),
      transform: [{ translateY: drag.get() * 0.9 }],
    };
  });

  /** The amount flies from the middle of the bubble to its anchored position in the header. */
  const amountStyle = useAnimatedStyle(() => {
    const value = effectiveProgress(progress.get(), drag.get(), height);
    const fromX = amountAnchor === null ? 0 : origin.x - amountAnchor.x;
    const fromY = amountAnchor === null ? 0 : origin.y - amountAnchor.y;
    const fromScale = amountAnchor?.scale ?? 1;

    return {
      transform: [
        { translateX: interpolate(value, [0, 1], [fromX, 0]) },
        { translateY: interpolate(value, [0, 1], [fromY, 0]) },
        { scale: interpolate(value, [0, 1], [fromScale, 1]) },
      ],
    };
  });

  /** Header coordinates are relative to the content box, so lift them into window space. */
  const handleAmountLayout = (event: LayoutChangeEvent) => {
    const { x, y, width: amountWidth, height: amountHeight } = event.nativeEvent.layout;
    const next = {
      x: x + horizontalPadding + amountWidth / 2,
      y: y + insets.top + 6 + amountHeight / 2,
      scale: (origin.size * 0.145) / detailAmountFontSize,
    };

    setAmountAnchor((current) =>
      current !== null && current.x === next.x && current.y === next.y && current.scale === next.scale
        ? current
        : next,
    );
  };

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
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
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

            <Animated.View onLayout={handleAmountLayout} style={[styles.amountBlock, amountStyle]}>
              <Text
                adjustsFontSizeToFit
                maxFontSizeMultiplier={1.4}
                minimumFontScale={0.6}
                numberOfLines={1}
                style={styles.amount}
              >
                {amount}
              </Text>
            </Animated.View>

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
    </View>
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
