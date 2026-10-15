import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AmountText } from '@/features/settings/privacy/amounts/amount-text';
import { useAmountFormatting } from '@/features/settings/privacy/amounts/use-private-amounts';
import { formatShare } from '@/features/app-shell/formatting/formatting';
import { useCopy } from '@/features/app-shell/localization/language';
import { overviewColors, overviewSpacing } from '@/features/app-shell/theme/overview-theme';
import { impactLight } from '@/haptics';

import { alertsCopy } from '../alerts-copy';
import type { AlertProgress } from '../evaluation/alert-evaluation';
import { scopeLabel } from '../delivery/alert-message';
import type { AlertRule } from '../rules/alert-rule';
import { LimitProgressBar } from '../components/limit-progress-bar';

export interface AlertRuleProgress {
  rule: AlertRule;
  progress: AlertProgress;
}

interface AlertsScreenProps {
  entries: AlertRuleProgress[];
  onClose: () => void;
  onCreate: () => void;
  onEdit: (rule: AlertRule) => void;
}

export function AlertsScreen({ entries, onClose, onCreate, onEdit }: AlertsScreenProps) {
  const { formatAmount } = useAmountFormatting();
  const copy = useCopy(alertsCopy);
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text maxFontSizeMultiplier={1.4} style={styles.title}>
          {copy.title}
        </Text>
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={onClose}
          style={({ pressed }) => [styles.headerAction, pressed ? styles.pressed : null]}
        >
          <Text maxFontSizeMultiplier={1.3} style={styles.headerActionLabel}>
            {copy.done}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        indicatorStyle="white"
      >
        {entries.length === 0 ? (
          <Text maxFontSizeMultiplier={1.5} style={styles.empty}>
            {copy.empty}
          </Text>
        ) : (
          entries.map(({ rule, progress }) => (
            <Pressable
              accessibilityHint={copy.editHint}
              accessibilityRole="button"
              key={rule.id}
              onPress={() => onEdit(rule)}
              style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
            >
              <View style={styles.cardHeading}>
                <AmountText maxFontSizeMultiplier={1.5} numberOfLines={1} style={styles.cardTitle}>
                  {scopeLabel(rule.scope)}
                </AmountText>
                <AmountText maxFontSizeMultiplier={1.5} style={styles.cardAmount}>
                  {formatAmount(progress.amountMinor, progress.currency)}
                </AmountText>
              </View>
              {rule.metric === 'expense' ? (
                <LimitProgressBar share={progress.share} />
              ) : (
                <View style={styles.track}>
                  <View
                    style={[
                      styles.fill,
                      {
                        width: `${Math.min(Math.max(progress.share * 100, 2), 100)}%`,
                        backgroundColor:
                          progress.share >= 1 ? overviewColors.negative : overviewColors.textSecondary,
                      },
                    ]}
                  />
                </View>
              )}
              <AmountText maxFontSizeMultiplier={1.5} style={styles.cardMeta}>
                {copy.metrics[rule.metric]} · {formatAmount(rule.targetMinor, progress.currency)}{' '}
                {copy.frequency[rule.period.kind]} · {formatShare(Math.min(progress.share, 1))}
                {rule.isActive ? '' : copy.disabled}
              </AmountText>
            </Pressable>
          ))
        )}

        <Pressable
          accessibilityRole="button"
          onPress={() => {
            impactLight();
            onCreate();
          }}
          style={({ pressed }) => [styles.create, pressed ? styles.pressed : null]}
        >
          <Text maxFontSizeMultiplier={1.4} style={styles.createLabel}>
            {copy.add}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: overviewColors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: overviewSpacing.gutter,
    paddingTop: overviewSpacing.gutter,
    paddingBottom: overviewSpacing.tight,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.6,
    color: overviewColors.textPrimary,
  },
  headerAction: {
    minHeight: 44,
    justifyContent: 'center',
  },
  headerActionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: overviewColors.textSecondary,
  },
  content: {
    gap: overviewSpacing.tight,
    paddingHorizontal: overviewSpacing.gutter,
  },
  empty: {
    fontSize: 14,
    lineHeight: 20,
    color: overviewColors.textSecondary,
  },
  card: {
    gap: 8,
    padding: 14,
    borderRadius: 16,
    backgroundColor: overviewColors.surface,
  },
  cardHeading: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardTitle: {
    flexShrink: 1,
    fontSize: 16,
    fontWeight: '600',
    color: overviewColors.textPrimary,
  },
  cardAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: overviewColors.textPrimary,
  },
  track: {
    height: 5,
    overflow: 'hidden',
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
  cardMeta: {
    fontSize: 12,
    color: overviewColors.textSecondary,
  },
  create: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: overviewColors.surfacePressed,
  },
  createLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: overviewColors.textPrimary,
  },
  pressed: {
    opacity: 0.6,
  },
});
