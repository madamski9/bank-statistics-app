import type { IngestionRecord } from '@bankstats/ingestion-native';
import { useCallback, useState } from 'react';

import { uncategorizedCategory } from '@/features/data/classification/categories';
import { supportsCategoryRule } from '@/features/data/classification/categorization-rule';
import type { FinancialAccount } from '@/features/data/financial-accounts/financial-account';
import { impactLight } from '@/haptics';

import {
  draftError,
  draftFromRecord,
  emptyDraft,
  recordFromDraft,
  type TransactionDraft,
} from './manual-transaction';

interface TransactionDraftOptions {
  record: IngestionRecord | null;
  accounts: FinancialAccount[];
  onSubmit: (record: IngestionRecord, options: { rememberCategory: boolean }) => void;
}

export function useTransactionDraft({ record, accounts, onSubmit }: TransactionDraftOptions) {
  const [draft, setDraft] = useState<TransactionDraft>(() =>
    record === null ? emptyDraft(new Date()) : draftFromRecord(record),
  );
  const [validationError, setValidationError] = useState<string | null>(null);
  const [rememberCategory, setRememberCategory] = useState(false);
  const canRemember =
    draft.category !== '' &&
    draft.category !== uncategorizedCategory &&
    supportsCategoryRule({
      kind: draft.kind === 'other' ? undefined : draft.kind,
      name: draft.name,
    });

  const update = useCallback((patch: Partial<TransactionDraft>) => {
    setValidationError(null);
    setDraft((current) => ({ ...current, ...patch }));
  }, []);

  const selectCategory = useCallback(
    (category: string) => {
      update({ category });

      if (category === uncategorizedCategory) {
        setRememberCategory(false);
      }
    },
    [update],
  );

  const toggleRememberCategory = useCallback(() => setRememberCategory((current) => !current), []);

  const submit = () => {
    const invalid = draftError(draft);

    if (invalid !== null) {
      setValidationError(invalid);

      return;
    }

    impactLight();
    onSubmit(recordFromDraft(draft, { record, now: new Date(), accounts }), {
      rememberCategory: rememberCategory && canRemember,
    });
  };

  return {
    draft,
    validationError,
    rememberCategory,
    canRemember,
    update,
    selectCategory,
    toggleRememberCategory,
    submit,
  };
}
