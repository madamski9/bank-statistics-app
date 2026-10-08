import { SymbolView } from 'expo-symbols';
import { useEffect, useState, type ComponentProps } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  interpolateColor,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { ScalePressable } from '@/features/app-shell/scale-pressable';
import { useCopy } from '@/features/localization/language';
import { AmountText } from '@/features/privacy/amount-text';
import { overviewColors, overviewSpacing } from '@/features/spending-overview/overview-theme';
import { formatDayHeading } from '@/features/transactions/format-date';
import { impactLight, selectionChanged } from '@/haptics';

import { ChoicePanel } from './choice-panel';
import type { IgnoreKind, IgnoreRule, IgnoreTarget } from './ignore-rule';
import { ignoredPaymentsCopy } from './ignored-payments-copy';

const disarmAfterMs = 4000;

type IgnoreMode = 'everything' | 'fromToday';
type Busy = IgnoreMode | 'stop' | null;
export type IgnoreOutcome = IgnoreMode | 'stopped';

type SymbolName = ComponentProps<typeof SymbolView>['name'];

const kindSymbols: Record<IgnoreKind, SymbolName> = {
  payment: { ios: 'cart', android: 'shopping_cart', web: 'shopping_cart' },
  outgoingTransfer: { ios: 'arrow.up.right', android: 'north_east', web: 'north_east' },
  incomingTransfer: { ios: 'arrow.down.left', android: 'south_west', web: 'south_west' },
};

export interface IgnoreChoiceTarget extends IgnoreTarget {
  historyCount: number;
  rule: IgnoreRule | null;
}

interface IgnoreChoiceProps {
  target: IgnoreChoiceTarget | null;
  onIgnore: (rule: IgnoreRule) => Promise<void>;
  onStopIgnoring: (target: IgnoreTarget) => Promise<void>;
  onDone: (outcome: IgnoreOutcome) => void;
  onDismiss: () => void;
}

export function IgnoreChoice({ target, onIgnore, onStopIgnoring, onDone, onDismiss }: IgnoreChoiceProps) {
  const copy = useCopy(ignoredPaymentsCopy);
  const [shown, setShown] = useState<IgnoreChoiceTarget | null>(target);
  const [session, setSession] = useState(0);

  if (target !== null && target !== shown) {
    setShown(target);
    setSession((current) => current + 1);
  }

  return (
    <ChoicePanel dismissLabel={copy.cancel} onDismiss={onDismiss} visible={target !== null}>
      {shown !== null ? (
        <IgnoreChoiceContent
          key={session}
          onDismiss={onDismiss}
          onDone={onDone}
          onIgnore={onIgnore}
          onStopIgnoring={onStopIgnoring}
          target={shown}
        />
      ) : null}
    </ChoicePanel>
  );
}

interface IgnoreChoiceContentProps extends Omit<IgnoreChoiceProps, 'target'> {
  target: IgnoreChoiceTarget;
}

function IgnoreChoiceContent({ target, onIgnore, onStopIgnoring, onDone, onDismiss }: IgnoreChoiceContentProps) {
  const copy = useCopy(ignoredPaymentsCopy);
  const [busy, setBusy] = useState<Busy>(null);
  const [isArmed, setIsArmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const armed = useSharedValue(0);

  useEffect(() => {
    armed.set(withTiming(isArmed ? 1 : 0, { duration: 220, reduceMotion: ReduceMotion.System }));

    if (!isArmed) {
      return;
    }

    const timer = setTimeout(() => setIsArmed(false), disarmAfterMs);

    return () => clearTimeout(timer);
  }, [armed, isArmed]);

  const armedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      armed.get(),
      [0, 1],
      ['rgba(255, 92, 122, 0.08)', 'rgba(255, 92, 122, 0.22)'],
    ),
    borderColor: interpolateColor(
      armed.get(),
      [0, 1],
      ['rgba(255, 92, 122, 0.25)', 'rgba(255, 92, 122, 0.7)'],
    ),
  }));

  const run = async (next: Exclude<Busy, null>, operation: () => Promise<void>) => {
    setBusy(next);
    setError(null);

    try {
      await operation();
      impactLight();
      onDone(next === 'stop' ? 'stopped' : next);
    } catch {
      setError(copy.saveFailed);
      setBusy(null);
    }
  };

  const choose = (mode: IgnoreMode) => {
    if (mode === 'everything' && !isArmed) {
      selectionChanged();
      setIsArmed(true);
      return;
    }

    const rule: IgnoreRule =
      mode === 'everything'
        ? { kind: target.kind, name: target.name }
        : { kind: target.kind, name: target.name, since: new Date().toISOString() };

    void run(mode, () => onIgnore(rule));
  };

  const isBusy = busy !== null;
  const status =
    target.rule === null
      ? copy.historyCount(target.historyCount)
      : target.rule.since === undefined
        ? copy.ruleEverything
        : copy.ruleSince(formatDayHeading(new Date(target.rule.since), new Date()).toLocaleLowerCase());

  return (
    <View style={styles.content}>
      <View style={styles.summary}>
        <View accessibilityElementsHidden importantForAccessibility="no" style={styles.kindIcon}>
          <SymbolView name={kindSymbols[target.kind]} size={20} tintColor={overviewColors.textPrimary} />
        </View>
        <View style={styles.summaryCopy}>
          <AmountText accessibilityRole="header" maxFontSizeMultiplier={1.35} numberOfLines={2} style={styles.title}>
            {target.name}
          </AmountText>
          <Text maxFontSizeMultiplier={1.4} style={styles.subtitle}>
            {copy.kinds[target.kind]} · {status}
          </Text>
        </View>
      </View>

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
          onPress={() => {
            const rule = target.rule;

            if (rule !== null) {
              void run('stop', () => onStopIgnoring(rule));
            }
          }}
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

interface OptionButtonProps {
  label: string;
  labelKey?: string;
  detail: string;
  symbol: SymbolName;
  tone?: 'default' | 'danger';
  disabled: boolean;
  isBusy: boolean;
  animatedStyle?: ComponentProps<typeof Animated.View>['style'];
  onPress: () => void;
}

function OptionButton({
  label,
  labelKey = 'idle',
  detail,
  symbol,
  tone = 'default',
  disabled,
  isBusy,
  animatedStyle,
  onPress,
}: OptionButtonProps) {
  const isDanger = tone === 'danger';
  const tint = isDanger ? overviewColors.negative : overviewColors.textPrimary;

  return (
    <ScalePressable
      accessibilityHint={detail}
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled, busy: isBusy }}
      disabled={disabled}
      onPress={onPress}
      pressedScale={0.97}
    >
      <Animated.View style={[styles.option, isDanger ? styles.optionDanger : null, animatedStyle]}>
        <View accessibilityElementsHidden importantForAccessibility="no" style={styles.optionIcon}>
          {isBusy ? (
            <ActivityIndicator color={tint} />
          ) : (
            <SymbolView name={symbol} size={19} tintColor={tint} weight="semibold" />
          )}
        </View>
        <Animated.View
          entering={labelKey === 'idle' ? undefined : FadeIn.duration(180).reduceMotion(ReduceMotion.System)}
          key={labelKey}
          style={styles.optionCopy}
        >
          <Text maxFontSizeMultiplier={1.4} style={[styles.optionLabel, { color: tint }]}>
            {label}
          </Text>
          <Text maxFontSizeMultiplier={1.4} style={styles.optionDetail}>
            {detail}
          </Text>
        </Animated.View>
      </Animated.View>
    </ScalePressable>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: overviewSpacing.section,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: overviewSpacing.row,
  },
  kindIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: overviewColors.surfacePressed,
  },
  summaryCopy: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.4,
    color: overviewColors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: overviewColors.textSecondary,
  },
  options: {
    gap: overviewSpacing.tight,
  },
  option: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: overviewSpacing.row,
    paddingHorizontal: overviewSpacing.block,
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: overviewColors.hairline,
    backgroundColor: overviewColors.surfacePressed,
  },
  optionDanger: {
    borderWidth: 1,
  },
  optionIcon: {
    width: 28,
    alignItems: 'center',
  },
  optionCopy: {
    flex: 1,
    gap: 3,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  optionDetail: {
    fontSize: 13,
    lineHeight: 18,
    color: overviewColors.textSecondary,
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
