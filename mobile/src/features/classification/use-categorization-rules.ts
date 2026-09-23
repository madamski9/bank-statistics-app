import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useState } from 'react';

import { privateRuleFor, upsertRule, type CategorizationRule } from './categorization-rule';
import { loadRules, saveRules, type RuleStorage } from './rule-storage';

const storageKey = 'bankstats.categorization-rules';

const secureStorage: RuleStorage = {
  read: () => SecureStore.getItemAsync(storageKey),
  write: (value) => SecureStore.setItemAsync(storageKey, value),
};

export function clearCategorizationRules(): Promise<void> {
  return SecureStore.deleteItemAsync(storageKey);
}

export interface CategorizationRules {
  rules: CategorizationRule[];
  remember: (merchantLabel: string, category: string) => Promise<void>;
  forget: (merchantKey: string) => Promise<void>;
}

export function useCategorizationRules(storage: RuleStorage = secureStorage): CategorizationRules {
  const [rules, setRules] = useState<CategorizationRule[]>([]);

  useEffect(() => {
    let isActive = true;

    void loadRules(storage).then((stored) => {
      if (isActive) {
        setRules(stored);
      }
    });

    return () => {
      isActive = false;
    };
  }, [storage]);

  const persist = useCallback(
    async (next: CategorizationRule[]) => {
      await saveRules(storage, next);
      setRules(next);
    },
    [storage],
  );

  const remember = useCallback(
    async (merchantLabel: string, category: string) => {
      await persist(upsertRule(rules, privateRuleFor(merchantLabel, category)));
    },
    [persist, rules],
  );

  const forget = useCallback(
    async (merchantKey: string) => {
      await persist(rules.filter((rule) => rule.merchantKey !== merchantKey));
    },
    [persist, rules],
  );

  return { rules, remember, forget };
}
