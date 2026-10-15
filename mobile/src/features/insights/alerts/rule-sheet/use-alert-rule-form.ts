import { useCallback, useState } from 'react';

import { currentCopy, useCopy } from '@/features/app-shell/localization/language';
import { parseAmountMinor } from '@/features/home/transactions/transaction-editor/manual-transaction';
import { impactLight } from '@/haptics';

import { alertsCopy } from '../alerts-copy';
import type { AlertPeriod } from '../evaluation/alert-period';
import type { AlertMetric, AlertRule, AlertScope } from '../rules/alert-rule';

export type RepeatingPeriod = Exclude<AlertPeriod, { kind: 'custom' }>['kind'];

const defaultApproachShare = 0.8;

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
  const [approachShare, setApproachShare] = useState<number | null>(
    rule === null
      ? defaultApproachShare
      : (rule.thresholdShares.find((share) => share < 1) ?? null),
  );
  const [missingIncome, setMissingIncome] = useState(rule?.condition === 'missingIncome');
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
    copy,
    metric,
    missingIncome,
    onRequestPermission,
    onSave,
    period,
    rule,
    selectedScope,
  ]);

  return {
    metric,
    selectedScope,
    period,
    amount,
    approachShare,
    missingIncome,
    error,
    isSaving,
    setMetric,
    setSelectedScope,
    setPeriod,
    setAmount,
    setApproachShare,
    toggleMissingIncome,
    save,
  };
}
