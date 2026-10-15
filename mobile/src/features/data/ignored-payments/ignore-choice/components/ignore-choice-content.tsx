import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';

import { useCopy } from '@/features/app-shell/localization/language';
import { overviewColors, overviewSpacing } from '@/features/app-shell/theme/overview-theme';

import { ignoredPaymentsCopy } from '../../ignored-payments-copy';
import type { IgnoreRule, IgnoreTarget } from '../../ignore-rule';
import {
  useIgnoreChoiceActions,
  type IgnoreChoiceTarget,
  type IgnoreOutcome,
} from '../use-ignore-choice-actions';
import { ChoiceSummary } from './choice-summary';
import { OptionButton } from './option-button';

interface IgnoreChoiceContentProps {
  target: IgnoreChoiceTarget;
  onIgnore: (rule: IgnoreRule) => Promise<void>;
  onStopIgnoring: (target: IgnoreTarget) => Promise<void>;
  onDone: (outcome: IgnoreOutcome) => void;
  onDismiss: () => void;
}

export function IgnoreChoiceContent({ target, onIgnore, onStopIgnoring, onDone, onDismiss }: IgnoreChoiceContentProps) {
  const copy = useCopy(ignoredPaymentsCopy);
  const { busy, isBusy, isArmed, error, armedStyle, choose, stop } = useIgnoreChoiceActions({
    target,
    onIgnore,
    onStopIgnoring,
    onDone,
  });

  return (
    <View style={styles.content}>
      <ChoiceSummary target={target} />

      {target.rule === null ? (
        <View style={styles.options}>
          <OptionButton
            detail={target.historyCount > 0 ? copy.fromTodayDetail : copy.startSkippingDetail}
            disabled={isBusy}
            isBusy={busy === 'fromToday'}
            label={target.historyCount > 0 ? copy.fromToday : copy.startSkipping}
            onPress={() => choose('fromToday')}
            symbol={{ ios: 'calendar.badge.clock', android: 'event_upcoming', web: 'event_upcoming' }}
          />
          {target.historyCount > 0 ? (
            <OptionButton
              animatedStyle={armedStyle}
              detail={isArmed ? copy.deleteArmedDetail : copy.deleteHistoryDetail(target.historyCount)}
              disabled={isBusy}
              isBusy={busy === 'everything'}
              label={isArmed ? copy.deleteArmed : copy.deleteHistory}
              labelKey={isArmed ? 'armed' : 'idle'}
              onPress={() => choose('everything')}
              symbol={{ ios: 'trash', android: 'delete', web: 'delete' }}
              tone="danger"
            />
          ) : null}
        </View>
      ) : (
        <OptionButton
          detail={copy.stopDetail}
          disabled={isBusy}
          isBusy={busy === 'stop'}
          label={copy.stop}
          onPress={stop}
          symbol={{ ios: 'eye', android: 'visibility', web: 'visibility' }}
        />
      )}

      {error !== null ? (
        <Animated.Text
          accessibilityLiveRegion="polite"
          entering={FadeIn.duration(180).reduceMotion(ReduceMotion.System)}
          maxFontSizeMultiplier={1.5}
          style={styles.error}
        >
          {error}
        </Animated.Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        disabled={isBusy}
        hitSlop={4}
        onPress={onDismiss}
        style={({ pressed }) => [styles.cancel, pressed ? styles.pressed : null]}
      >
        <Text maxFontSizeMultiplier={1.4} style={styles.cancelLabel}>
          {copy.cancel}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: overviewSpacing.section,
  },
  options: {
    gap: overviewSpacing.tight,
  },
  error: {
    fontSize: 14,
    lineHeight: 20,
    color: overviewColors.negative,
  },
  cancel: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: overviewColors.textSecondary,
  },
  pressed: {
    opacity: 0.6,
  },
});
