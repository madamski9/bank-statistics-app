import type { IngestionRecord } from '@bankstats/ingestion-native';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

import { useCopy } from '@/features/app-shell/localization/language';

import { confirmedRecord } from './transaction-editor/manual-transaction';
import { transactionsCopy } from './transactions-copy';
import { useTransactionWrites } from './use-transaction-writes';

export type EditorTarget =
  | { mode: 'detail'; record: IngestionRecord }
  | { mode: 'edit'; record: IngestionRecord | null };

interface TransactionEditingOptions {
  onChanged: () => void | Promise<void>;
  onRememberRule: (merchantLabel: string, category: string) => Promise<void>;
}

export function useTransactionEditing({ onChanged, onRememberRule }: TransactionEditingOptions) {
  const copy = useCopy(transactionsCopy);
  const [editor, setEditor] = useState<EditorTarget | null>(null);
  const { clearError, error: writeError, isWriting, remove, save } = useTransactionWrites(onChanged);

  const closeEditor = useCallback(() => {
    clearError();
    setEditor(null);
  }, [clearError]);

  const submit = useCallback(
    (record: IngestionRecord, { rememberCategory } = { rememberCategory: false }) => {
      void save(record).then(async (saved) => {
        if (!saved) {
          return;
        }

        if (rememberCategory && record.merchant !== undefined && record.category !== undefined) {
          try {
            await onRememberRule(record.merchant, record.category);
          } catch {
            Alert.alert(
              copy.ruleNotSavedTitle,
              copy.ruleNotSavedBody,
            );
          }
        }

        closeEditor();
      });
    },
    [closeEditor, copy, onRememberRule, save],
  );

  const confirm = useCallback(() => {
    const target = editor?.record;

    if (target === null || target === undefined) {
      return;
    }

    submit(confirmedRecord(target));
  }, [editor, submit]);

  const requestDelete = useCallback(() => {
    const target = editor?.record;

    if (target === null || target === undefined) {
      return;
    }

    Alert.alert(copy.deleteTitle, copy.deleteBody, [
      { style: 'cancel', text: copy.cancel },
      {
        style: 'destructive',
        text: copy.deleteConfirm,
        onPress: () => {
          void remove(target.id).then((removed) => {
            if (removed) {
              closeEditor();
            }
          });
        },
      },
    ]);
  }, [closeEditor, copy, editor, remove]);

  const cancelEditing = useCallback(() => {
    clearError();
    setEditor((current) =>
      current === null || current.record === null ? null : { mode: 'detail', record: current.record },
    );
  }, [clearError]);

  return {
    editor,
    writeError,
    isWriting,
    openDetail: (record: IngestionRecord) => setEditor({ mode: 'detail', record }),
    openEditor: (record: IngestionRecord | null) => setEditor({ mode: 'edit', record }),
    closeEditor,
    cancelEditing,
    submit,
    confirm,
    requestDelete,
  };
}

export type TransactionEditing = ReturnType<typeof useTransactionEditing>;
