import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatAmount, formatShare } from '@/features/spending-overview/formatting';
import { overviewColors, overviewSpacing } from '@/features/spending-overview/overview-theme';
import { impactLight } from '@/haptics';

import type { AlertProgress } from './alert-evaluation';
import { scopeLabel } from './alert-message';
import type { AlertRule } from './alert-rule';

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

const periodLabels: Record<string, string> = {
  week: 'tygodniowo',
  month: 'miesięcznie',
  year: 'rocznie',
  custom: 'w wybranym okresie',
};

const metricLabels: Record<AlertRule['metric'], string> = {
  expense: 'Wydatki',
  income: 'Przychody',
  netFlow: 'Bilans',
};

export function AlertsScreen({ entries, onClose, onCreate, onEdit }: AlertsScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text maxFontSizeMultiplier={1.4} style={styles.title}>
          Limity i alerty
        </Text>
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={onClose}
          style={({ pressed }) => [styles.headerAction, pressed ? styles.pressed : null]}
        >
          <Text maxFontSizeMultiplier={1.3} style={styles.headerActionLabel}>
            Gotowe
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        indicatorStyle="white"
      >
        {entries.length === 0 ? (
          <Text maxFontSizeMultiplier={1.5} style={styles.empty}>
            Nie masz jeszcze żadnego limitu. Ustaw kwotę na miesiąc, a damy znać, zanim ją
            osiągniesz.
          </Text>
        ) : (
          entries.map(({ rule, progress }) => (
            <Pressable
              accessibilityHint="Otwiera ustawienia limitu"
              accessibilityRole="button"
              key={rule.id}
              onPress={() => onEdit(rule)}
              style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
            >
              <View style={styles.cardHeading}>
                <Text maxFontSizeMultiplier={1.5} numberOfLines={1} style={styles.cardTitle}>
                  {scopeLabel(rule.scope)}
                </Text>
                <Text maxFontSizeMultiplier={1.5} style={styles.cardAmount}>
                  {formatAmount(progress.amountMinor, progress.currency)}
                </Text>
              </View>
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
              <Text maxFontSizeMultiplier={1.5} style={styles.cardMeta}>
                {metricLabels[rule.metric]} · {formatAmount(rule.targetMinor, progress.currency)}{' '}
                {periodLabels[rule.period.kind]} · {formatShare(Math.min(progress.share, 1))}
                {rule.isActive ? '' : ' · wyłączony'}
              </Text>
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
            Dodaj limit wszystkich wydatków
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
