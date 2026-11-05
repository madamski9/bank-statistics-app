import { extractPdfText, saveIngestionRecord, type IngestionRecord } from '@bankstats/ingestion-native';
import { File } from 'expo-file-system';
import { useCallback, useState } from 'react';

import type { FinancialAccount } from '@/features/data/financial-accounts/financial-account';
import { saveForCurrentOwner } from '@/features/data/local-storage/current-owner-writes';

import type { StatementBank } from './parsing/statement-bank';
import type { StatementParseProblem, StatementParseResult } from './parsing/statement-parser';
import { readStatement } from './parsing/statement-reading';
import { decodeStatementBytes } from './parsing/statement-text';
import {
  reconcileStatement,
  recordsFromStatement,
  type ReconciledRow,
  type StatementReconciliation,
} from './parsing/statement-reconciliation';

export type StatementImportProblem = StatementParseProblem | 'unreadable' | 'pickerUnavailable';

export type StatementImportState =
  | { step: 'idle' }
  | { step: 'reading' }
  | { step: 'failed'; problem: StatementImportProblem }
  | {
      step: 'reviewing';
      bank: StatementBank;
      reconciliation: StatementReconciliation;
      skippedCount: number;
      selectedKeys: Set<string>;
      isSaving: boolean;
      saveFailed: boolean;
    }
  | { step: 'finished'; addedCount: number };

const statementTypes = [
  'text/csv',
  'text/comma-separated-values',
  'text/plain',
  'application/vnd.ms-excel',
  'application/pdf',
];

const pdfSignature = [0x25, 0x50, 0x44, 0x46];

function isPdf(bytes: Uint8Array): boolean {
  return pdfSignature.every((byte, index) => bytes[index] === byte);
}

async function parseStatementFile(file: File): Promise<StatementParseResult> {
  const bytes = await file.bytes();

  if (!isPdf(bytes)) {
    return readStatement(decodeStatementBytes(bytes), 'csv');
  }

  return readStatement(await extractPdfText(file.uri), 'pdf');
}

function missingRows(reconciliation: StatementReconciliation): ReconciledRow[] {
  return reconciliation.rows.filter((row) => row.match === null);
}

export function useStatementImport(
  records: IngestionRecord[],
  accounts: FinancialAccount[],
  onImported: () => void | Promise<void>,
) {
  const [state, setState] = useState<StatementImportState>({ step: 'idle' });

  const choose = useCallback(async () => {
    let picker: typeof import('expo-document-picker');

    try {
      picker = await import('expo-document-picker');
    } catch {
      setState({ step: 'failed', problem: 'pickerUnavailable' });
      return;
    }

    const picked = await picker.getDocumentAsync({ type: statementTypes, copyToCacheDirectory: true });

    if (picked.canceled) {
      return;
    }

    setState({ step: 'reading' });

    const file = new File(picked.assets[0].uri);

    try {
      const parsed = await parseStatementFile(file);

      if (!parsed.ok) {
        setState({ step: 'failed', problem: parsed.problem });
        return;
      }

      const reconciliation = reconcileStatement(parsed.rows, parsed.bank, records);

      setState({
        step: 'reviewing',
        bank: parsed.bank,
        reconciliation,
        skippedCount: parsed.skippedCount,
        selectedKeys: new Set(missingRows(reconciliation).map((row) => row.key)),
        isSaving: false,
        saveFailed: false,
      });
    } catch {
      setState({ step: 'failed', problem: 'unreadable' });
    } finally {
      if (file.exists) {
        file.delete();
      }
    }
  }, [records]);

  const toggle = useCallback((key: string) => {
    setState((current) => {
      if (current.step !== 'reviewing' || current.isSaving) {
        return current;
      }

      const selectedKeys = new Set(current.selectedKeys);

      if (selectedKeys.has(key)) {
        selectedKeys.delete(key);
      } else {
        selectedKeys.add(key);
      }

      return { ...current, selectedKeys };
    });
  }, []);

  const addSelected = useCallback(async () => {
    if (state.step !== 'reviewing' || state.isSaving || state.selectedKeys.size === 0) {
      return;
    }

    const chosen = missingRows(state.reconciliation).filter((row) => state.selectedKeys.has(row.key));
    const additions = recordsFromStatement(chosen, state.bank, accounts, new Date());

    setState({ ...state, isSaving: true, saveFailed: false });

    try {
      await saveForCurrentOwner(additions, saveIngestionRecord);
      await onImported();
      setState({ step: 'finished', addedCount: additions.length });
    } catch {
      await onImported();
      setState({ ...state, isSaving: false, saveFailed: true });
    }
  }, [accounts, onImported, state]);

  const reset = useCallback(() => setState({ step: 'idle' }), []);

  return { state, choose, toggle, addSelected, reset };
}
