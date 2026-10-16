import { useCallback, useState } from 'react';

import { currentCopy, useCopy } from '@/features/app-shell/localization/language';
import { parseAmountMinor } from '@/features/home/transactions/transaction-editor/manual-transaction';
import { impactLight } from '@/haptics';

import { alertsCopy } from '../alerts-copy';
import type { AlertPeriod } from '../evaluation/alert-period';
import {
  toneDelivery,
  defaultAlertTone,
  notificationShares,
  type AlertMetric,
  type AlertRule,
  type AlertScope,
  type AlertTone,
} from '../rules/alert-rule';

export type RepeatingPeriod = Exclude<AlertPeriod, { kind: 'custom' }>['kind'];

function amountFromMinor(minor: number): string {
  return `${Math.trunc(minor / 100)}${currentCopy(alertsCopy).decimalSeparator}${String(minor % 100).padStart(2, '0')}`;
}

function ruleIdentifier(now: Date, random: () => number): string {
  return `alert-${now.getTime().toString(36)}-${Math.floor(random() * 0xffffff).toString(36)}`;
}

interface AlertRuleFormOptions {
  scope: AlertScope;
  rule: AlertRule | null;
  onSave: (rule: AlertRule) => Promise<void>;
  onRequestPermission: () => Promise<boolean>;
}

export function useAlertRuleForm({ scope, rule, onSave, onRequestPermission }: AlertRuleFormOptions) {
  const copy = useCopy(alertsCopy);
  const [metric, setMetricState] = useState<AlertMetric>(rule?.metric ?? 'expense');
  const [selectedScope, setSelectedScope] = useState<AlertScope>(scope);
  const [period, setPeriod] = useState<RepeatingPeriod>(
    rule === null || rule.period.kind === 'custom' ? 'month' : rule.period.kind,
  );
  const [amount, setAmountState] = useState(rule === null ? '' : amountFromMinor(rule.targetMinor));
  const [isNotifying, setIsNotifying] = useState(rule === null || rule.thresholdShares.length > 0);
  const [missingIncome, setMissingIncome] = useState(rule?.condition === 'missingIncome');
  const [tone, setTone] = useState<AlertTone>(rule?.tone ?? defaultAlertTone);
  const delivery = toneDelivery({
    metric,
    scope: selectedScope,
    condition: missingIncome ? 'missingIncome' : 'threshold',
  });
  const hasTone = delivery !== null;
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const setMetric = useCallback((next: AlertMetric) => {
    setMetricState(next);

    if (next !== 'income') {
      setMissingIncome(false);
    }
  }, []);

  const setAmount = useCallback((next: string) => {
    setError(null);
    setAmountState(next);
  }, []);

  const toggleMissingIncome = useCallback(() => setMissingIncome((current) => !current), []);

  const save = useCallback(async () => {
    const targetMinor = parseAmountMinor(amount);

    if (targetMinor === null || !Number.isSafeInteger(targetMinor)) {
      setError(copy.enterAmount);

      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      if (!(await onRequestPermission())) {
        setError(
          copy.permissionDenied,
        );

        return;
      }

      const condition = metric === 'income' && missingIncome ? 'missingIncome' : 'threshold';

      impactLight();
      await onSave({
        id: rule?.id ?? ruleIdentifier(new Date(), Math.random),
        metric,
        scope: selectedScope,
        period: { kind: period },
        condition,
        targetMinor,
        thresholdShares: condition === 'missingIncome' ? [1] : isNotifying ? notificationShares : [],
        isActive: true,
        createdAt: rule?.createdAt ?? new Date().toISOString(),
        ...(hasTone ? { tone } : {}),
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setIsSaving(false);
    }
  }, [
    amount,
    copy,
    metric,
    missingIncome,
    onRequestPermission,
    onSave,
    hasTone,
    isNotifying,
    period,
    rule,
    selectedScope,
    tone,
  ]);

  return {
    metric,
    selectedScope,
    period,
    amount,
    isNotifying,
    missingIncome,
    tone,
    delivery,
    error,
    isSaving,
    setMetric,
    setSelectedScope,
    setPeriod,
    setAmount,
    setIsNotifying,
    setTone,
    toggleMissingIncome,
    save,
  };
}
