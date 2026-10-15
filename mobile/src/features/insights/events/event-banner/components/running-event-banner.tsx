import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ReduceMotion } from 'react-native-reanimated';

import { useCopy } from '@/features/app-shell/localization/language';
import { overviewColors } from '@/features/app-shell/theme/overview-theme';
import { reportingCurrency } from '@/features/data/currency-conversion/exchange-rate';
import { AmountText } from '@/features/settings/privacy/amounts/amount-text';
import { useAmountFormatting } from '@/features/settings/privacy/amounts/use-private-amounts';
import { impactLight, selectionChanged } from '@/haptics';

import { eventTint } from '../../event-colors';
import type { EventSummary } from '../../event-summary';
import { eventsCopy } from '../../events-copy';
import { bannerStyles } from './banner-styles';

const swapIn = FadeIn.duration(200).delay(60).reduceMotion(ReduceMotion.System);
const swapOut = FadeOut.duration(120).reduceMotion(ReduceMotion.System);

interface RunningEventBannerProps {
  runningEvent: EventSummary;
  isEventFocused: boolean;
  onOpenEvents: () => void;
  onToggleEventFocus: () => void;
}

export function RunningEventBanner({
  runningEvent,
  isEventFocused,
  onOpenEvents,
  onToggleEventFocus,
}: RunningEventBannerProps) {
  const copy = useCopy(eventsCopy);
  const { formatAmount } = useAmountFormatting();
  const tint = eventTint(runningEvent.event).film;

  return (
    <View style={bannerStyles.row}>
      <Pressable
        accessibilityHint={copy.bannerOpenHint}
        accessibilityLabel={`${copy.activeCard(runningEvent.event.name)}, ${formatAmount(runningEvent.expenseMinor, reportingCurrency)}`}
        accessibilityRole="button"
        onPress={() => {
          impactLight();
          onOpenEvents();
        }}
        style={({ pressed }) => [bannerStyles.banner, styles.activeBanner, pressed ? bannerStyles.pressed : null]}
      >
        <View style={[styles.dot, { backgroundColor: tint }]} />
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
        style={({ pressed }) => [bannerStyles.banner, styles.toggle, pressed ? bannerStyles.pressed : null]}
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
            tintColor={isEventFocused ? overviewColors.textPrimary : tint}
            weight="semibold"
          />
          <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={styles.toggleLabel}>
            {isEventFocused ? copy.showAll : copy.showEvent}
          </Text>
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
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
