import { useCallback, useMemo, useState } from 'react';

import type { IngestionRecord } from '@bankstats/ingestion-native';

import type { CategorizationRule } from '@/features/data/classification/categorization-rule';
import type { SpendingGroup } from '@/features/data/classification/spending-groups';
import { alertProgress } from '@/features/insights/alerts/evaluation/alert-evaluation';
import type { AlertRule, AlertScope } from '@/features/insights/alerts/rules/alert-rule';
import { groupLimit, ruleForScope, scopeForGroup } from '@/features/insights/alerts/rules/group-limit';
import { merchantOptions } from '@/features/insights/alerts/rules/merchant-options';
import type { AlertsState } from '@/features/insights/alerts/use-alerts';
import { canCreateLimit, type PremiumReason } from '@/features/settings/premium/premium-access';

interface AlertEditor {
  scope: AlertScope;
  rule: AlertRule | null;
  isScopeLocked?: boolean;
}

interface AlertEditorOptions {
  alerts: AlertsState;
  countedRecords: IngestionRecord[];
  rules: CategorizationRule[];
  group: SpendingGroup | null;
  hasPremiumAccess: boolean;
  openPremium: (reason: PremiumReason) => void;
}

export function useAlertEditor({
  alerts,
  countedRecords,
  rules,
  group,
  hasPremiumAccess,
  openPremium,
}: AlertEditorOptions) {
  const [editor, setEditor] = useState<AlertEditor | null>(null);
  const merchants = useMemo(() => merchantOptions(countedRecords, rules), [countedRecords, rules]);
  const selectedLimit = useMemo(
    () =>
      group === null
        ? null
        : groupLimit(group, alerts.rules, countedRecords, rules, new Date()),
    [alerts.rules, countedRecords, group, rules],
  );
  const entries = useMemo(
    () =>
      alerts.rules.map((rule) => ({
        rule,
        progress: alertProgress(rule, countedRecords, { reference: new Date(), rules }),
      })),
    [alerts.rules, countedRecords, rules],
  );

  const requestNewLimit = useCallback(
    (scope: AlertScope, isScopeLocked = false) => {
      if (!canCreateLimit(alerts.rules.length, hasPremiumAccess)) {
        openPremium('limit');
        return;
      }

      setEditor({ scope, rule: null, isScopeLocked });
    },
    [alerts.rules.length, hasPremiumAccess, openPremium],
  );

  const editGroupLimit = useCallback(() => {
    if (group === null) {
      return;
    }

    const scope = scopeForGroup(group);
    const rule = ruleForScope(alerts.rules, scope);

    if (rule === null) {
      requestNewLimit(scope, true);
      return;
    }

    setEditor({ scope, rule, isScopeLocked: true });
  }, [alerts.rules, group, requestNewLimit]);

  const editRule = useCallback((rule: AlertRule) => setEditor({ scope: rule.scope, rule }), []);
  const requireTonePremium = useCallback(() => {
    setEditor(null);
    openPremium('alertTone');
  }, [openPremium]);
  const close = useCallback(() => setEditor(null), []);

  const save = useCallback(
    async (rule: AlertRule) => {
      await alerts.save(rule);
      setEditor(null);
    },
    [alerts],
  );

  const remove = useCallback(
    async (id: string) => {
      await alerts.remove(id);
      setEditor(null);
    },
    [alerts],
  );

  return {
    editor,
    isFirstRule: alerts.rules.length === 0,
    canUseAggressiveTone: hasPremiumAccess,
    requireTonePremium,
    merchants,
    selectedLimit,
    entries,
    requestNewLimit,
    editGroupLimit,
    editRule,
    close,
    save,
    remove,
  };
}

export type AlertEditing = ReturnType<typeof useAlertEditor>;
