import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ReduceMotion } from 'react-native-reanimated';

import { NamePrompt } from '@/features/app-shell/name-prompt';
import { reportingCurrency } from '@/features/currency-conversion/exchange-rate';
import { useCopy } from '@/features/localization/language';
import { AmountText } from '@/features/privacy/amount-text';
import { useAmountFormatting } from '@/features/privacy/use-private-amounts';
import { overviewColors } from '@/features/spending-overview/overview-theme';
import { impactLight, selectionChanged } from '@/haptics';

import { eventTint } from './event-colors';
import type { EventSummary } from './event-summary';
import { eventsCopy } from './events-copy';
import { eventNameError, type SpendingEvent } from './spending-event';

const swapIn = FadeIn.duration(200).delay(60).reduceMotion(ReduceMotion.System);
const swapOut = FadeOut.duration(120).reduceMotion(ReduceMotion.System);

interface EventBannerProps {
  runningEvent: EventSummary | null;
  isEventFocused: boolean;
  canStartEvent: boolean;
  onRequirePremium: () => void;
  onToggleEventFocus: () => void;
  onStartEvent: (name: string) => Promise<SpendingEvent>;
  onOpenEvents: () => void;
}

export function EventBanner({
  runningEvent,
  isEventFocused,
  canStartEvent,
  onRequirePremium,
  onToggleEventFocus,
  onStartEvent,
  onOpenEvents,
}: EventBannerProps) {
  const copy = useCopy(eventsCopy);
  const { formatAmount } = useAmountFormatting();
  const [isPrompting, setIsPrompting] = useState(false);

  return (
    <>
      {runningEvent === null ? (
        <View style={styles.activeRow}>
          <Pressable
            accessibilityHint={canStartEvent ? copy.bannerStartHint : copy.premiumHint}
            accessibilityLabel={copy.start}
            accessibilityRole="button"
            onPress={() => {
              impactLight();

              if (canStartEvent) {
                setIsPrompting(true);
              } else {
                onRequirePremium();
              }
            }}
            style={({ pressed }) => [styles.banner, styles.startBanner, pressed ? styles.pressed : null]}
          >
            <SymbolView
              name={{ ios: 'plus', android: 'add', web: 'add' }}
              size={13}
              tintColor={overviewColors.textSecondary}
              weight="semibold"
            />
            <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={styles.startLabel}>
              {copy.start}
            </Text>
            {canStartEvent ? null : (
              <SymbolView
                name={{ ios: 'lock.fill', android: 'lock', web: 'lock' }}
                size={12}
                tintColor={overviewColors.caution}
              />
            )}
          </Pressable>
        </View>
      ) : (
        <View style={styles.activeRow}>
          <Pressable
            accessibilityHint={copy.bannerOpenHint}
            accessibilityLabel={`${copy.activeCard(runningEvent.event.name)}, ${formatAmount(runningEvent.expenseMinor, reportingCurrency)}`}
            accessibilityRole="button"
            onPress={() => {
              impactLight();
              onOpenEvents();
            }}
            style={({ pressed }) => [styles.banner, styles.activeBanner, pressed ? styles.pressed : null]}
          >
            <View style={[styles.dot, { backgroundColor: eventTint(runningEvent.event).film }]} />
            <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={styles.activeLabel}>
              {copy.activeCard(runningEvent.event.name)}
            </Text>
            {isEventFocused ? null : (
              <Animated.View entering={swapIn} exiting={swapOut} style={styles.fixed}>
                <AmountText maxFontSizeMultiplier={1.3} numberOfLines={1} style={styles.amount}>
                  {formatAmount(runningEvent.expenseMinor, reportingCurrency)}
                </AmountText>
              </Animated.View>
            )}
            <SymbolView
              name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
              size={12}
              style={styles.chevron}
              tintColor={overviewColors.textSecondary}
              weight="semibold"
            />
          </Pressable>
          <Pressable
            accessibilityHint={isEventFocused ? copy.showAllHint : copy.showEventHint}
            accessibilityLabel={isEventFocused ? copy.showAll : copy.showEvent}
            accessibilityRole="button"
            onPress={() => {
              selectionChanged();
              onToggleEventFocus();
            }}
            style={({ pressed }) => [styles.banner, styles.toggle, pressed ? styles.pressed : null]}
          >
            <Animated.View
              entering={swapIn}
              exiting={swapOut}
              key={isEventFocused ? 'all' : 'event'}
              style={styles.toggleContent}
            >
              <SymbolView
                name={
                  isEventFocused
                    ? { ios: 'circle.grid.2x1', android: 'bubble_chart', web: 'bubble_chart' }
                    : { ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }
                }
                size={13}
                tintColor={isEventFocused ? overviewColors.textPrimary : eventTint(runningEvent.event).film}
                weight="semibold"
              />
              <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={styles.toggleLabel}>
                {isEventFocused ? copy.showAll : copy.showEvent}
              </Text>
            </Animated.View>
          </Pressable>
        </View>
      )}

      <NamePrompt
        cancelLabel={copy.cancel}
        confirmLabel={copy.start}
        message={copy.startMessage}
        onCancel={() => setIsPrompting(false)}
        onConfirm={async (name) => {
          await onStartEvent(name);
          setIsPrompting(false);
        }}
        placeholder={copy.namePlaceholder}
        title={copy.startTitle}
        validate={eventNameError}
        visible={isPrompting}
      />
    </>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: overviewColors.hairline,
    backgroundColor: overviewColors.surface,
  },
  activeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  startBanner: {
    flex: 1,
    minWidth: 0,
  },
  activeBanner: {
    flex: 1,
    minWidth: 0,
  },
  toggle: {
    flexShrink: 0,
    paddingHorizontal: 12,
  },
  toggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pressed: {
    backgroundColor: overviewColors.surfacePressed,
  },
  startLabel: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '600',
    color: overviewColors.textSecondary,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  activeLabel: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    fontSize: 14,
    fontWeight: '600',
    color: overviewColors.textPrimary,
  },
  fixed: {
    flexShrink: 0,
  },
  chevron: {
    flexShrink: 0,
    width: 12,
    height: 12,
  },
  amount: {
    marginRight: 2,
    fontSize: 14,
    fontWeight: '600',
    color: overviewColors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  toggleLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: overviewColors.textPrimary,
  },
});
