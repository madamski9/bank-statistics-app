import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { overviewColors, overviewSpacing } from '@/features/spending-overview/overview-theme';
import { parseAmountMinor } from '@/features/transactions/manual-transaction';
import { impactLight, selectionChanged } from '@/haptics';

import type { AlertPeriod } from './alert-period';
import type { AlertMetric, AlertRule, AlertScope } from './alert-rule';
import { scopeLabel } from './alert-message';

interface AlertRuleSheetProps {
  scope: AlertScope;
  rule: AlertRule | null;
  isFirstRule: boolean;
  onCancel: () => void;
  onSave: (rule: AlertRule) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onRequestPermission: () => Promise<boolean>;
}

const metrics: { value: AlertMetric; label: string }[] = [
  { value: 'expense', label: 'Wydatki' },
  { value: 'income', label: 'Przychody' },
  { value: 'netFlow', label: 'Bilans' },
];

type RepeatingPeriod = Exclude<AlertPeriod, { kind: 'custom' }>['kind'];

const periods: { value: RepeatingPeriod; label: string }[] = [
  { value: 'week', label: 'Tydzień' },
  { value: 'month', label: 'Miesiąc' },
  { value: 'year', label: 'Rok' },
];

const approachShares = [0.5, 0.8, 0.9] as const;

const defaultApproachShare = 0.8;

function amountFromMinor(minor: number): string {
  return `${Math.trunc(minor / 100)},${String(minor % 100).padStart(2, '0')}`;
}

function ruleIdentifier(now: Date, random: () => number): string {
  return `alert-${now.getTime().toString(36)}-${Math.floor(random() * 0xffffff).toString(36)}`;
}

export function AlertRuleSheet({
  scope,
  rule,
  isFirstRule,
  onCancel,
  onSave,
  onDelete,
  onRequestPermission,
}: AlertRuleSheetProps) {
  const insets = useSafeAreaInsets();
  const [metric, setMetric] = useState<AlertMetric>(rule?.metric ?? 'expense');
  const [period, setPeriod] = useState<RepeatingPeriod>(
    rule === null || rule.period.kind === 'custom' ? 'month' : rule.period.kind,
  );
  const [amount, setAmount] = useState(rule === null ? '' : amountFromMinor(rule.targetMinor));
  const [approachShare, setApproachShare] = useState<number | null>(
    rule === null
      ? defaultApproachShare
      : (rule.thresholdShares.find((share) => share < 1) ?? null),
  );
  const [missingIncome, setMissingIncome] = useState(rule?.condition === 'missingIncome');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = useCallback(async () => {
    const targetMinor = parseAmountMinor(amount);

    if (targetMinor === null) {
      setError('Podaj kwotę większą od zera.');

      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      if (!(await onRequestPermission())) {
        setError(
          'Bez zgody na powiadomienia nie damy znać o progu. Możesz ją włączyć w Ustawieniach systemu.',
        );

        return;
      }

      const condition = metric === 'income' && missingIncome ? 'missingIncome' : 'threshold';

      impactLight();
      await onSave({
        id: rule?.id ?? ruleIdentifier(new Date(), Math.random),
        metric,
        scope,
        period: { kind: period },
        condition,
        targetMinor,
        thresholdShares:
          condition === 'missingIncome' || approachShare === null ? [1] : [approachShare, 1],
        isActive: true,
        createdAt: rule?.createdAt ?? new Date().toISOString(),
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setIsSaving(false);
    }
  }, [
    amount,
    approachShare,
    metric,
    missingIncome,
    onRequestPermission,
    onSave,
    period,
    rule,
    scope,
  ]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.screen}
    >
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={onCancel}
          style={({ pressed }) => [styles.headerAction, pressed ? styles.pressed : null]}
        >
          <Text maxFontSizeMultiplier={1.3} style={styles.headerActionLabel}>
            Anuluj
          </Text>
        </Pressable>
        <Text maxFontSizeMultiplier={1.3} style={styles.title}>
          {rule === null ? 'Nowy limit' : 'Limit'}
        </Text>
        <Pressable
          accessibilityRole="button"
          disabled={isSaving}
          hitSlop={8}
          onPress={() => void handleSave()}
          style={({ pressed }) => [
            styles.headerAction,
            styles.headerActionEnd,
            pressed ? styles.pressed : null,
          ]}
        >
          {isSaving ? (
            <ActivityIndicator color={overviewColors.textPrimary} />
          ) : (
            <Text maxFontSizeMultiplier={1.3} style={styles.submitLabel}>
              Zapisz
            </Text>
          )}
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text maxFontSizeMultiplier={1.5} style={styles.scope}>
          {scopeLabel(scope)}
        </Text>

        <View style={styles.chips}>
          {metrics.map((option) => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: option.value === metric }}
              key={option.value}
              onPress={() => {
                selectionChanged();
                setMetric(option.value);

                if (option.value !== 'income') {
                  setMissingIncome(false);
                }
              }}
              style={({ pressed }) => [
                styles.chip,
                option.value === metric ? styles.chipActive : null,
                pressed ? styles.pressed : null,
              ]}
            >
              <Text
                maxFontSizeMultiplier={1.3}
                style={[styles.chipLabel, option.value === metric ? styles.chipLabelActive : null]}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.chips}>
          {periods.map((option) => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: option.value === period }}
              key={option.value}
              onPress={() => {
                selectionChanged();
                setPeriod(option.value);
              }}
              style={({ pressed }) => [
                styles.chip,
                option.value === period ? styles.chipActive : null,
                pressed ? styles.pressed : null,
              ]}
            >
              <Text
                maxFontSizeMultiplier={1.3}
                style={[styles.chipLabel, option.value === period ? styles.chipLabelActive : null]}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.amountRow}>
          <TextInput
            accessibilityLabel="Kwota limitu"
            autoFocus={rule === null}
            keyboardType="decimal-pad"
            onChangeText={(next) => {
              setError(null);
              setAmount(next);
            }}
            placeholder="0,00"
            placeholderTextColor={overviewColors.textDisabled}
            selectionColor={overviewColors.textPrimary}
            style={styles.amountInput}
            value={amount}
          />
          <Text maxFontSizeMultiplier={1.3} style={styles.currency}>
            zł
          </Text>
        </View>

        {metric === 'income' ? (
          <Toggle
            hint="Damy znać po zakończeniu okresu, jeśli wpływ nie nadejdzie."
            isOn={missingIncome}
            label="Ostrzeż, gdy wpływ nie nadejdzie"
            onToggle={() => {
              selectionChanged();
              setMissingIncome((current) => !current);
            }}
          />
        ) : null}

        {missingIncome ? null : (
          <View style={styles.approach}>
            <Text maxFontSizeMultiplier={1.4} style={styles.approachLabel}>
              Uprzedź, gdy wydasz
            </Text>
            <View style={styles.chips}>
              {[...approachShares, null].map((share) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: share === approachShare }}
                  key={share === null ? 'none' : share}
                  onPress={() => {
                    selectionChanged();
                    setApproachShare(share);
                  }}
                  style={({ pressed }) => [
                    styles.chip,
                    share === approachShare ? styles.chipActive : null,
                    pressed ? styles.pressed : null,
                  ]}
                >
                  <Text
                    maxFontSizeMultiplier={1.3}
                    style={[
                      styles.chipLabel,
                      share === approachShare ? styles.chipLabelActive : null,
                    ]}
                  >
                    {share === null ? 'Bez uprzedzenia' : `${Math.round(share * 100)}%`}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {isFirstRule && rule === null ? (
          <Text maxFontSizeMultiplier={1.5} style={styles.note}>
            Zapytamy o zgodę na powiadomienia, bo bez niej nie damy znać o progu.
          </Text>
        ) : null}

        {error !== null ? (
          <Text accessibilityLiveRegion="polite" maxFontSizeMultiplier={1.5} style={styles.error}>
            {error}
          </Text>
        ) : null}

        {rule !== null && onDelete !== undefined ? (
          <Pressable
            accessibilityRole="button"
            disabled={isSaving}
            onPress={() => void onDelete(rule.id)}
            style={({ pressed }) => [styles.deleteButton, pressed ? styles.pressed : null]}
          >
            <Text maxFontSizeMultiplier={1.4} style={styles.deleteLabel}>
              Usuń limit
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

interface ToggleProps {
  label: string;
  hint: string;
  isOn: boolean;
  onToggle: () => void;
}

function Toggle({ label, hint, isOn, onToggle }: ToggleProps) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: isOn }}
      onPress={onToggle}
      style={({ pressed }) => [styles.toggle, pressed ? styles.pressed : null]}
    >
      <View style={[styles.checkbox, isOn ? styles.checkboxOn : null]}>
        {isOn ? (
          <Text maxFontSizeMultiplier={1.2} style={styles.checkmark}>
            ✓
          </Text>
        ) : null}
      </View>
      <View style={styles.toggleCopy}>
        <Text maxFontSizeMultiplier={1.4} style={styles.toggleLabel}>
          {label}
        </Text>
        <Text maxFontSizeMultiplier={1.4} style={styles.toggleHint}>
          {hint}
        </Text>
      </View>
    </Pressable>
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
    paddingTop: overviewSpacing.tight,
    paddingBottom: overviewSpacing.tight,
  },
  headerAction: {
    minWidth: 72,
    minHeight: 44,
    justifyContent: 'center',
  },
  headerActionEnd: {
    alignItems: 'flex-end',
  },
  headerActionLabel: {
    fontSize: 16,
    color: overviewColors.textSecondary,
  },
  submitLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: overviewColors.textPrimary,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: overviewColors.textPrimary,
  },
  content: {
    gap: overviewSpacing.block,
    paddingHorizontal: overviewSpacing.gutter,
    paddingTop: overviewSpacing.tight,
  },
  scope: {
    fontSize: 15,
    fontWeight: '600',
    color: overviewColors.textSecondary,
  },
  approach: {
    gap: 10,
  },
  approachLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: overviewColors.textPrimary,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: overviewColors.surface,
  },
  chipActive: {
    backgroundColor: overviewColors.surfacePressed,
  },
  chipLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: overviewColors.textSecondary,
  },
  chipLabelActive: {
    color: overviewColors.textPrimary,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: -1,
    color: overviewColors.textPrimary,
  },
  currency: {
    fontSize: 20,
    fontWeight: '600',
    color: overviewColors.textSecondary,
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    minHeight: 44,
  },
  toggleCopy: {
    flex: 1,
    gap: 2,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: overviewColors.textPrimary,
  },
  toggleHint: {
    fontSize: 13,
    lineHeight: 18,
    color: overviewColors.textSecondary,
  },
  checkbox: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    backgroundColor: overviewColors.surface,
  },
  checkboxOn: {
    backgroundColor: overviewColors.surfacePressed,
  },
  checkmark: {
    fontSize: 13,
    fontWeight: '700',
    color: overviewColors.textPrimary,
  },
  note: {
    fontSize: 13,
    lineHeight: 18,
    color: overviewColors.textSecondary,
  },
  error: {
    fontSize: 14,
    lineHeight: 20,
    color: overviewColors.negative,
  },
  deleteButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: overviewColors.negative,
  },
  pressed: {
    opacity: 0.6,
  },
});
