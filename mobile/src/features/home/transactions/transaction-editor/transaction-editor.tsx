import type { IngestionRecord } from '@bankstats/ingestion-native';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCopy } from '@/features/app-shell/localization/language';
import { NamePrompt } from '@/features/app-shell/name-prompt/name-prompt';
import { overviewColors, overviewSpacing } from '@/features/app-shell/theme/overview-theme';
import type { CustomCategory } from '@/features/data/classification/categories';
import { customCategoriesCopy } from '@/features/data/classification/custom-categories/custom-categories-copy';
import { customCategoryNameError } from '@/features/data/classification/custom-categories/custom-category';
import { AccountPicker } from '@/features/data/financial-accounts/components/account-picker';
import type { FinancialAccount } from '@/features/data/financial-accounts/financial-account';
import type { SpendingEvent } from '@/features/insights/events/spending-event';

import { reviewPrompt } from '../record/transaction-record';
import { transactionsCopy } from '../transactions-copy';
import { AmountInput } from './components/amount-input';
import { CategoryPicker } from './components/category-picker';
import { DirectionSwitcher } from './components/direction-switcher';
import { EditorCard, EditorField, EditorReadOnlyField, EditorSeparator } from './components/editor-card';
import { EditorHeader } from './components/editor-header';
import { EventPicker } from './components/event-picker';
import { KindChips } from './components/kind-chips';
import { ReviewBanner } from './components/review-banner';
import { kindForDirection, type TransactionDraft } from './manual-transaction';
import { useTransactionDraft } from './use-transaction-draft';

interface TransactionEditorProps {
  record: IngestionRecord | null;
  initialDraft?: TransactionDraft;
  accounts: FinancialAccount[];
  onCreateAccount: (name: string) => Promise<FinancialAccount>;
  isWriting: boolean;
  writeError: string | null;
  onCancel: () => void;
  onSubmit: (record: IngestionRecord, options: { rememberCategory: boolean }) => void;
  onConfirm?: () => void;
  onDelete?: () => void;
  events?: SpendingEvent[];
  customCategories?: CustomCategory[];
  canCreateCategory?: boolean;
  canRememberRule?: boolean;
  onCreateCategory?: (name: string) => Promise<CustomCategory>;
  onRequirePremium?: () => void;
}

export function TransactionEditor({
  record,
  initialDraft,
  accounts,
  onCreateAccount,
  isWriting,
  writeError,
  onCancel,
  onSubmit,
  onConfirm,
  onDelete,
  events = [],
  customCategories = [],
  canCreateCategory = false,
  canRememberRule = false,
  onCreateCategory,
  onRequirePremium,
}: TransactionEditorProps) {
  const insets = useSafeAreaInsets();
  const copy = useCopy(transactionsCopy);
  const categoryCopy = useCopy(customCategoriesCopy);
  const [isNamingCategory, setIsNamingCategory] = useState(false);
  const {
    draft,
    validationError,
    rememberCategory,
    canRemember,
    update,
    selectCategory,
    toggleRememberCategory,
    submit,
  } = useTransactionDraft({ record, accounts, onSubmit, initialDraft });
  const prompt = record?.review === undefined ? null : reviewPrompt(record.review);
  const isManual = record === null || record.origin === 'manual';
  const title = record === null ? copy.newTransaction : prompt === null ? copy.editing : copy.toReview;
  const error = validationError ?? writeError;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.screen}
    >
      <EditorHeader isWriting={isWriting} onCancel={onCancel} onSubmit={submit} title={title} />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {prompt !== null ? <ReviewBanner isWriting={isWriting} onConfirm={onConfirm} prompt={prompt} /> : null}

        <DirectionSwitcher
          direction={draft.direction}
          onChange={(direction) => update({ direction, kind: kindForDirection(direction, draft.kind) })}
        />

        <KindChips direction={draft.direction} kind={draft.kind} onChange={(kind) => update({ kind })} />

        <AmountInput
          amount={draft.amount}
          autoFocus={record === null}
          currency={draft.currency}
          onChangeAmount={(amount) => update({ amount })}
          onChangeCurrency={(currency) => update({ currency })}
        />

        <EditorCard>
          <EditorField
            label={copy.name}
            onChangeText={(name) => update({ name })}
            placeholder={copy.namePlaceholder}
            value={draft.name}
          />
          {isManual ? null : (
            <>
              <EditorSeparator />
              <EditorReadOnlyField label={copy.account} value={record?.accountName ?? copy.bankGeneralAccount} />
            </>
          )}
        </EditorCard>

        {draft.bankName !== undefined && record !== null ? (
          <>
            <EditorCard>
              <EditorReadOnlyField label={copy.notificationTitle} value={record.notificationTitle ?? ''} />
              <EditorSeparator />
              <EditorField
                label={copy.bankName}
                onChangeText={(bankName) => update({ bankName })}
                placeholder={copy.bankNamePlaceholder}
                value={draft.bankName}
              />
            </EditorCard>
            <Text maxFontSizeMultiplier={1.5} style={styles.bankHelp}>{copy.rememberBankHelp}</Text>
          </>
        ) : null}

        {isManual ? (
          <AccountPicker
            accounts={accounts}
            onCreate={async (name) => {
              const account = await onCreateAccount(name);
              update({ accountId: account.id });
            }}
            onSelect={(accountId) => update({ accountId })}
            selectedId={draft.accountId}
          />
        ) : null}

        <CategoryPicker
          canAddCategory={onCreateCategory !== undefined}
          canRemember={canRemember}
          category={draft.category}
          isRemembering={rememberCategory}
          merchantName={draft.name}
          onAddCategory={() => (canCreateCategory ? setIsNamingCategory(true) : onRequirePremium?.())}
          onSelect={selectCategory}
          onToggleRemember={() => (canRememberRule ? toggleRememberCategory() : onRequirePremium?.())}
        />

        {events.length > 0 ? (
          <EventPicker eventId={draft.eventId} events={events} onSelect={(eventId) => update({ eventId })} />
        ) : null}

        <EditorCard>
          <EditorField
            keyboardType="numbers-and-punctuation"
            label={copy.date}
            onChangeText={(date) => update({ date })}
            placeholder="DD.MM.RRRR"
            value={draft.date}
          />
          <EditorSeparator />
          <EditorField
            keyboardType="numbers-and-punctuation"
            label={copy.time}
            onChangeText={(time) => update({ time })}
            placeholder="GG:MM"
            value={draft.time}
          />
        </EditorCard>

        {error !== null ? (
          <Text accessibilityLiveRegion="polite" maxFontSizeMultiplier={1.5} style={styles.error}>
            {error}
          </Text>
        ) : null}

        {onDelete !== undefined ? (
          <Pressable
            accessibilityRole="button"
            disabled={isWriting}
            onPress={onDelete}
            style={({ pressed }) => [styles.deleteButton, pressed ? styles.pressed : null]}
          >
            <Text maxFontSizeMultiplier={1.4} style={styles.deleteLabel}>
              {copy.delete}
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <NamePrompt
        cancelLabel={categoryCopy.cancel}
        confirmLabel={categoryCopy.create}
        onCancel={() => setIsNamingCategory(false)}
        onConfirm={async (name) => {
          if (onCreateCategory === undefined) {
            return;
          }

          const category = await onCreateCategory(name);
          update({ category: category.id });
          setIsNamingCategory(false);
        }}
        placeholder={categoryCopy.placeholder}
        title={categoryCopy.addTitle}
        validate={(name) => customCategoryNameError(name, customCategories)}
        visible={isNamingCategory}
      />
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
    paddingTop: overviewSpacing.block,
  },
  error: {
    fontSize: 13,
    lineHeight: 18,
    color: overviewColors.negative,
  },
  bankHelp: {
    fontSize: 13,
    lineHeight: 18,
    color: overviewColors.textSecondary,
  },
  deleteButton: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 92, 122, 0.35)',
    backgroundColor: 'rgba(255, 92, 122, 0.08)',
  },
  deleteLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: overviewColors.negative,
  },
  pressed: {
    opacity: 0.6,
  },
});
