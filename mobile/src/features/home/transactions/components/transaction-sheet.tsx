import type { IngestionRecord } from '@bankstats/ingestion-native';
import { Modal } from 'react-native';

import { overviewColors } from '@/features/app-shell/theme/overview-theme';
import type { CustomCategory } from '@/features/data/classification/categories';
import type { CategorizationRule } from '@/features/data/classification/categorization-rule';
import type { FinancialAccount } from '@/features/data/financial-accounts/financial-account';
import type { IgnoreRule, IgnoreTarget } from '@/features/data/ignored-payments/ignore-rule';
import type { SpendingEvent } from '@/features/insights/events/spending-event';
import { PrivacyShield } from '@/features/settings/privacy/privacy-shield';

import { TransactionDetail } from '../transaction-detail/transaction-detail';
import { TransactionEditor } from '../transaction-editor/transaction-editor';
import type { TransactionEditing } from '../use-transaction-editing';

interface TransactionSheetProps {
  editing: TransactionEditing;
  records: IngestionRecord[];
  accounts: FinancialAccount[];
  rules: CategorizationRule[];
  events: SpendingEvent[];
  customCategories: CustomCategory[];
  ignoreRules: IgnoreRule[];
  canCreateCategory: boolean;
  canRememberRule: boolean;
  onCreateAccount: (name: string) => Promise<FinancialAccount>;
  onCreateCategory: (name: string) => Promise<CustomCategory>;
  onIgnore: (rule: IgnoreRule) => Promise<void>;
  onStopIgnoring: (target: IgnoreTarget) => Promise<void>;
  onRequirePremium: () => void;
}

export function TransactionSheet({
  editing,
  records,
  accounts,
  rules,
  events,
  customCategories,
  ignoreRules,
  canCreateCategory,
  canRememberRule,
  onCreateAccount,
  onCreateCategory,
  onIgnore,
  onStopIgnoring,
  onRequirePremium,
}: TransactionSheetProps) {
  const { editor } = editing;

  return (
    <Modal
      animationType="slide"
      backdropColor={overviewColors.background}
      onRequestClose={editing.closeEditor}
      presentationStyle="pageSheet"
      visible={editor !== null}
    >
      {editor === null ? null : editor.mode === 'detail' ? (
        <TransactionDetail
          isWriting={editing.isWriting}
          onClose={editing.closeEditor}
          onDelete={editing.requestDelete}
          onStopAwaitingWallet={editing.stopAwaitingWallet}
          history={records}
          ignoreRules={ignoreRules}
          onIgnore={onIgnore}
          onStopIgnoring={onStopIgnoring}
          onEdit={() => editing.openEditor(editor.record)}
          events={events}
          record={editor.record}
          rules={rules}
          writeError={editing.writeError}
        />
      ) : (
        <TransactionEditor
          accounts={accounts}
          canCreateCategory={canCreateCategory}
          canRememberRule={canRememberRule}
          customCategories={customCategories}
          events={events}
          isWriting={editing.isWriting}
          key={editor.record?.id ?? 'new'}
          onCancel={editing.cancelEditing}
          onCreateAccount={onCreateAccount}
          onCreateCategory={onCreateCategory}
          onRequirePremium={() => {
            editing.closeEditor();
            onRequirePremium();
          }}
          onConfirm={editor.record?.review === undefined ? undefined : editing.confirm}
          onDelete={editor.record !== null ? editing.requestDelete : undefined}
          onSubmit={editing.submit}
          record={editor.record}
          writeError={editing.writeError}
        />
      )}
      <PrivacyShield />
    </Modal>
  );
}
