import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCopy } from '@/features/app-shell/localization/language';
import { overviewColors, overviewSpacing } from '@/features/app-shell/theme/overview-theme';
import { selectionChanged } from '@/haptics';

import { alertsCopy } from '../alerts-copy';
import { scopeLabel } from '../delivery/alert-message';
import { alertTones, type AlertMetric, type AlertRule, type AlertScope } from '../rules/alert-rule';
import type { CategoryScopeOption } from '../rules/category-options';
import { CheckToggle } from './components/check-toggle';
import { FormField } from './components/form-field';
import { LimitAmountInput } from './components/limit-amount-input';
import { OptionChips } from './components/option-chips';
import { RuleSheetHeader } from './components/rule-sheet-header';
import { ScopePicker } from './components/scope-picker';
import { useAlertRuleForm, type RepeatingPeriod } from './use-alert-rule-form';

interface AlertRuleSheetProps {
  scope: AlertScope;
  merchants: Extract<AlertScope, { kind: 'merchant' }>[];
  categories: CategoryScopeOption[];
  rule: AlertRule | null;
  isFirstRule: boolean;
  isScopeLocked: boolean;
  canUseAggressiveTone: boolean;
  onRequireTonePremium: () => void;
  onCancel: () => void;
  onSave: (rule: AlertRule) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onRequestPermission: () => Promise<boolean>;
}

const metrics: AlertMetric[] = ['expense', 'income', 'netFlow'];
const periods: RepeatingPeriod[] = ['week', 'month', 'year'];
const notificationChoices = [true, false] as const;

export function AlertRuleSheet({
  scope,
  merchants,
  categories,
  rule,
  isFirstRule,
  isScopeLocked,
  canUseAggressiveTone,
  onRequireTonePremium,
  onCancel,
  onSave,
  onDelete,
  onRequestPermission,
}: AlertRuleSheetProps) {
  const copy = useCopy(alertsCopy);
  const insets = useSafeAreaInsets();
  const form = useAlertRuleForm({ scope, rule, onSave, onRequestPermission });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.screen}
    >
      <RuleSheetHeader
        isSaving={form.isSaving}
        onCancel={onCancel}
        onSave={() => void form.save()}
        title={rule === null ? copy.newLimit : copy.limit}
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        {!isScopeLocked && scope.kind !== 'counterparty' ? (
          <ScopePicker
            categories={categories}
            initialScope={scope}
            merchants={merchants}
            onSelect={form.setSelectedScope}
            selectedScope={form.selectedScope}
          />
        ) : (
          <Text maxFontSizeMultiplier={1.4} numberOfLines={2} style={styles.scope}>
            {scopeLabel(scope)}
          </Text>
        )}

        {isScopeLocked ? null : (
          <OptionChips
            onSelect={form.setMetric}
            options={metrics.map((value) => ({ key: value, value, label: copy.metrics[value] }))}
            selected={form.metric}
          />
        )}

        <LimitAmountInput amount={form.amount} onChange={form.setAmount} />

        <FormField label={copy.period}>
          <OptionChips
            onSelect={form.setPeriod}
            options={periods.map((value) => ({ key: value, value, label: copy.periodNames[value] }))}
            selected={form.period}
          />
        </FormField>

        {form.metric === 'income' ? (
          <CheckToggle
            hint={copy.missingIncomeHint}
            isOn={form.missingIncome}
            label={copy.missingIncomeLabel}
            onToggle={() => {
              selectionChanged();
              form.toggleMissingIncome();
            }}
          />
        ) : null}

        {form.missingIncome ? null : (
          <FormField label={copy.notificationsLabel}>
            <OptionChips
              onSelect={form.setIsNotifying}
              options={notificationChoices.map((value) => ({
                key: String(value),
                value,
                label: value ? copy.notificationsOn : copy.notificationsOff,
              }))}
              selected={form.isNotifying}
            />
          </FormField>
        )}

        {form.delivery !== null && form.isNotifying ? (
          <FormField label={copy.toneLabel}>
            <OptionChips
              onSelect={(tone) => {
                if (tone === 'aggressive' && !canUseAggressiveTone) {
                  onRequireTonePremium();
                  return;
                }

                if (tone === 'aggressive' && form.tone !== 'aggressive') {
                  Alert.alert(copy.aggressiveWarningTitle, copy.aggressiveWarningBody, [
                    { style: 'cancel', text: copy.cancel },
                    { style: 'destructive', text: copy.aggressiveWarningConfirm, onPress: () => form.setTone(tone) },
                  ]);
                  return;
                }

                form.setTone(tone);
              }}
              options={alertTones.map((value) => ({
                key: value,
                value,
                label:
                  value === 'aggressive' && !canUseAggressiveTone ? copy.premiumTone(copy.tones[value]) : copy.tones[value],
              }))}
              selected={form.tone}
            />
            <Text maxFontSizeMultiplier={1.5} style={styles.note}>
              {copy.deliveryHints[form.delivery]} {copy.toneHints[form.tone]}
            </Text>
          </FormField>
        ) : null}

        {isFirstRule && rule === null ? (
          <Text maxFontSizeMultiplier={1.5} style={styles.note}>
            {copy.permissionNote}
          </Text>
        ) : null}

        {form.error !== null ? (
          <Text accessibilityLiveRegion="polite" maxFontSizeMultiplier={1.5} style={styles.error}>
            {form.error}
          </Text>
        ) : null}

        {rule !== null && onDelete !== undefined ? (
          <Pressable
            accessibilityRole="button"
            disabled={form.isSaving}
            onPress={() => void onDelete(rule.id)}
            style={({ pressed }) => [styles.deleteButton, pressed ? styles.pressed : null]}
          >
            <Text maxFontSizeMultiplier={1.4} style={styles.deleteLabel}>
              {copy.delete}
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: overviewColors.background,
  },
  content: {
    gap: overviewSpacing.block,
    paddingHorizontal: overviewSpacing.gutter,
    paddingTop: overviewSpacing.tight,
  },
  scope: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.4,
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
