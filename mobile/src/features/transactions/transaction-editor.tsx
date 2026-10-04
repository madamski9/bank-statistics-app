import { maximumTextLength } from '@bankstats/convex/convex/changeRules';
import type { IngestionRecord } from '@bankstats/ingestion-native';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { impactLight, selectionChanged } from '@/haptics';
import {
  categoryOptions,
  uncategorizedCategory,
  uncategorizedLabel,
} from '@/features/classification/categories';
import { supportsCategoryRule } from '@/features/classification/categorization-rule';
import type { CustomCategory } from '@/features/classification/categories';
import { customCategoriesCopy } from '@/features/classification/custom-categories-copy';
import { customCategoryNameError } from '@/features/classification/custom-category';
import { eventsCopy } from '@/features/events/events-copy';
import { noEventId, sortedEvents, type SpendingEvent } from '@/features/events/spending-event';
import { NamePrompt } from '@/features/sheets/name-prompt';
import { AccountPicker } from '@/features/financial-accounts/account-picker';
import type { FinancialAccount } from '@/features/financial-accounts/financial-account';
import { overviewColors, overviewSpacing } from '@/features/spending-overview/overview-theme';
import { useCopy } from '@/features/localization/language';

import { transactionsCopy } from './transactions-copy';
import {
  draftError,
  draftFromRecord,
  emptyDraft,
  kindForDirection,
  recordFromDraft,
  transactionKindOptions,
  type TransactionDirection,
  type TransactionDraft,
} from './manual-transaction';
import { reviewPrompt } from './transaction-record';

interface TransactionEditorProps {
  record: IngestionRecord | null;
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
  onCreateCategory?: (name: string) => Promise<CustomCategory>;
  onRequirePremium?: () => void;
}

const maximumEventChips = 6;

const directionOrder: TransactionDirection[] = ['expense', 'income'];

export function TransactionEditor({
  record,
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
  onCreateCategory,
  onRequirePremium,
}: TransactionEditorProps) {
  const insets = useSafeAreaInsets();
  const copy = useCopy(transactionsCopy);
  const eventCopy = useCopy(eventsCopy);
  const categoryCopy = useCopy(customCategoriesCopy);
  const [isNamingCategory, setIsNamingCategory] = useState(false);
  const eventOptions = [
    { id: '', label: eventCopy.automatic },
    { id: noEventId, label: eventCopy.none },
    ...sortedEvents(events)
      .slice(0, maximumEventChips)
      .map((event) => ({ id: event.id, label: event.name })),
  ];
  const [draft, setDraft] = useState<TransactionDraft>(() =>
    record === null ? emptyDraft(new Date()) : draftFromRecord(record),
  );
  const [validationError, setValidationError] = useState<string | null>(null);
  const [rememberCategory, setRememberCategory] = useState(false);
  const prompt = record?.review === undefined ? null : reviewPrompt(record.review);
  const isManual = record === null || record.origin === 'manual';
  const title = record === null ? copy.newTransaction : prompt === null ? copy.editing : copy.toReview;
  const error = validationError ?? writeError;
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

  const handleSubmit = () => {
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

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.screen}
    >
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={onCancel}
          style={({ pressed }) => [styles.headerAction, pressed ? styles.pressed : null]}
        >
          <Text maxFontSizeMultiplier={1.3} style={styles.headerActionLabel}>
            {copy.cancel}
          </Text>
        </Pressable>
        <Text maxFontSizeMultiplier={1.3} style={styles.title}>
          {title}
        </Text>
        <Pressable
          accessibilityRole="button"
          disabled={isWriting}
          hitSlop={8}
          onPress={handleSubmit}
          style={({ pressed }) => [
            styles.headerAction,
            styles.headerActionEnd,
            pressed ? styles.pressed : null,
          ]}
        >
          {isWriting ? (
            <ActivityIndicator color={overviewColors.textPrimary} />
          ) : (
            <Text maxFontSizeMultiplier={1.3} style={styles.submitLabel}>
              {copy.save}
            </Text>
          )}
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {prompt !== null ? (
          <View style={styles.review}>
            <Text maxFontSizeMultiplier={1.5} style={styles.prompt}>
              {prompt}
            </Text>
            {onConfirm !== undefined ? (
              <Pressable
                accessibilityRole="button"
                disabled={isWriting}
                onPress={() => {
                  impactLight();
                  onConfirm();
                }}
                style={({ pressed }) => [styles.confirmButton, pressed ? styles.pressed : null]}
              >
                <Text maxFontSizeMultiplier={1.4} style={styles.confirmLabel}>
                  {copy.confirmUnchanged}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        <View accessibilityRole="tablist" style={styles.directions}>
          {directionOrder.map((value) => ({ value, label: copy.directions[value] })).map((option) => {
            const isActive = option.value === draft.direction;

            return (
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
                key={option.value}
                onPress={() => {
                  selectionChanged();
                  update({
                    direction: option.value,
                    kind: kindForDirection(option.value, draft.kind),
                  });
                }}
                style={[styles.direction, isActive ? styles.directionActive : null]}
              >
                <Text
                  maxFontSizeMultiplier={1.3}
                  style={[styles.directionLabel, isActive ? styles.directionLabelActive : null]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.kinds}>
          {transactionKindOptions(draft.direction).map((option) => {
            const isActive = option.value === draft.kind;

            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                key={option.value}
                onPress={() => {
                  selectionChanged();
                  update({ kind: option.value });
                }}
                style={({ pressed }) => [
                  styles.kind,
                  isActive ? styles.kindActive : null,
                  pressed ? styles.pressed : null,
                ]}
              >
                <Text
                  maxFontSizeMultiplier={1.3}
                  style={[styles.kindLabel, isActive ? styles.kindLabelActive : null]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.amountRow}>
          <TextInput
            accessibilityLabel={copy.amount}
            autoFocus={record === null}
            keyboardType="decimal-pad"
            onChangeText={(amount) => update({ amount })}
            placeholder="0,00"
            placeholderTextColor={overviewColors.textDisabled}
            selectionColor={overviewColors.textPrimary}
            style={styles.amountInput}
            value={draft.amount}
          />
          <TextInput
            accessibilityLabel={copy.currency}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={3}
            onChangeText={(currency) => update({ currency })}
            selectionColor={overviewColors.textPrimary}
            style={styles.currencyInput}
            value={draft.currency}
          />
        </View>

        <View style={styles.card}>
          <EditorField
            label={copy.name}
            maxLength={maximumTextLength}
            onChangeText={(name) => update({ name })}
            placeholder={copy.namePlaceholder}
            value={draft.name}
          />
          {isManual ? null : (
            <>
              <View style={styles.separator} />
              <View accessible style={styles.field}>
                <Text maxFontSizeMultiplier={1.4} style={styles.fieldLabel}>
                  {copy.account}
                </Text>
                <Text maxFontSizeMultiplier={1.4} numberOfLines={1} style={styles.fieldValue}>
                  {record?.accountName ?? copy.bankGeneralAccount}
                </Text>
              </View>
            </>
          )}
        </View>

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

        <View style={styles.categories}>
          <Text maxFontSizeMultiplier={1.4} style={styles.sectionLabel}>
            {copy.category}
          </Text>
          <View style={styles.chips}>
            {[{ id: uncategorizedCategory, label: uncategorizedLabel() }, ...categoryOptions()].map((option) => {
              const isActive = option.id === draft.category;

              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                  key={option.id}
                  onPress={() => {
                    selectionChanged();
                    update({ category: option.id });

                    if (option.id === uncategorizedCategory) {
                      setRememberCategory(false);
                    }
                  }}
                  style={({ pressed }) => [
                    styles.chip,
                    isActive ? styles.chipActive : null,
                    pressed ? styles.pressed : null,
                  ]}
                >
                  <Text
                    maxFontSizeMultiplier={1.3}
                    style={[styles.chipLabel, isActive ? styles.chipLabelActive : null]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
            {onCreateCategory !== undefined ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  selectionChanged();

                  if (canCreateCategory) {
                    setIsNamingCategory(true);
                  } else {
                    onRequirePremium?.();
                  }
                }}
                style={({ pressed }) => [styles.chip, pressed ? styles.pressed : null]}
              >
                <Text maxFontSizeMultiplier={1.3} style={styles.chipLabel}>
                  {categoryCopy.newChip}
                </Text>
              </Pressable>
            ) : null}
          </View>
          {canRemember ? (
            <Pressable
              accessibilityRole="switch"
              accessibilityState={{ checked: rememberCategory }}
              onPress={() => {
                selectionChanged();
                setRememberCategory((current) => !current);
              }}
              style={({ pressed }) => [styles.remember, pressed ? styles.pressed : null]}
            >
              <View style={[styles.checkbox, rememberCategory ? styles.checkboxOn : null]}>
                {rememberCategory ? (
                  <Text maxFontSizeMultiplier={1.2} style={styles.checkmark}>
                    ✓
                  </Text>
                ) : null}
              </View>
              <Text maxFontSizeMultiplier={1.4} style={styles.rememberLabel}>
                {copy.rememberCategory(draft.name.trim())}
              </Text>
            </Pressable>
          ) : null}
        </View>

        {events.length > 0 ? (
          <View style={styles.categories}>
            <Text maxFontSizeMultiplier={1.4} style={styles.sectionLabel}>
              {eventCopy.eventLabel}
            </Text>
            <View style={styles.chips}>
              {eventOptions.map((option) => {
                const isActive = option.id === draft.eventId;

                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: isActive }}
                    key={option.id === '' ? 'automatic' : option.id}
                    onPress={() => {
                      selectionChanged();
                      update({ eventId: option.id });
                    }}
                    style={({ pressed }) => [
                      styles.chip,
                      isActive ? styles.chipActive : null,
                      pressed ? styles.pressed : null,
                    ]}
                  >
                    <Text
                      maxFontSizeMultiplier={1.3}
                      numberOfLines={1}
                      style={[styles.chipLabel, isActive ? styles.chipLabelActive : null]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        <View style={styles.card}>
          <EditorField
            keyboardType="numbers-and-punctuation"
            label={copy.date}
            onChangeText={(date) => update({ date })}
            placeholder="DD.MM.RRRR"
            value={draft.date}
          />
          <View style={styles.separator} />
          <EditorField
            keyboardType="numbers-and-punctuation"
            label={copy.time}
            onChangeText={(time) => update({ time })}
            placeholder="GG:MM"
            value={draft.time}
          />
        </View>

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

interface EditorFieldProps {
  label: string;
  value: string;
  placeholder: string;
  keyboardType?: 'default' | 'numbers-and-punctuation';
  maxLength?: number;
  onChangeText: (value: string) => void;
}

function EditorField({
  label,
  value,
  placeholder,
  keyboardType = 'default',
  maxLength,
  onChangeText,
}: EditorFieldProps) {
  return (
    <View style={styles.field}>
      <Text maxFontSizeMultiplier={1.4} style={styles.fieldLabel}>
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        autoCorrect={false}
        keyboardType={keyboardType}
        maxLength={maxLength}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={overviewColors.textDisabled}
        selectionColor={overviewColors.textPrimary}
        style={styles.fieldInput}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  categories: {
    gap: 10,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: overviewColors.textSecondary,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 17,
    backgroundColor: overviewColors.surface,
  },
  chipActive: {
    backgroundColor: overviewColors.surfacePressed,
  },
  chipLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: overviewColors.textSecondary,
  },
  chipLabelActive: {
    color: overviewColors.textPrimary,
  },
  remember: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 44,
  },
  checkbox: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    backgroundColor: overviewColors.surface,
  },
  checkboxOn: {
    backgroundColor: overviewColors.surfacePressed,
  },
  checkmark: {
    fontSize: 13,
    fontWeight: '700',
    color: overviewColors.textPrimary,
  },
  rememberLabel: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: overviewColors.textSecondary,
  },
  screen: {
    flex: 1,
    backgroundColor: overviewColors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: overviewSpacing.gutter,
    paddingTop: overviewSpacing.tight,
    paddingBottom: overviewSpacing.tight,
  },
  headerAction: {
    minWidth: 76,
    minHeight: 44,
    justifyContent: 'center',
  },
  headerActionEnd: {
    alignItems: 'flex-end',
  },
  headerActionLabel: {
    fontSize: 16,
    color: overviewColors.textSecondary,
  },
  submitLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: overviewColors.textPrimary,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '600',
    color: overviewColors.textPrimary,
  },
  content: {
    gap: overviewSpacing.block,
    paddingHorizontal: overviewSpacing.gutter,
    paddingTop: overviewSpacing.block,
  },
  review: {
    gap: overviewSpacing.row,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 196, 107, 0.3)',
    backgroundColor: 'rgba(255, 196, 107, 0.08)',
    padding: 14,
  },
  prompt: {
    fontSize: 14,
    lineHeight: 20,
    color: overviewColors.caution,
  },
  confirmButton: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: 'rgba(255, 196, 107, 0.16)',
  },
  confirmLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: overviewColors.caution,
  },
  directions: {
    flexDirection: 'row',
    gap: 6,
    padding: 4,
    borderRadius: 14,
    backgroundColor: overviewColors.surface,
  },
  direction: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
  },
  directionActive: {
    backgroundColor: overviewColors.surfacePressed,
  },
  directionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: overviewColors.textSecondary,
  },
  directionLabelActive: {
    color: overviewColors.textPrimary,
  },
  kinds: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  kind: {
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 17,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: overviewColors.hairline,
    backgroundColor: overviewColors.surface,
  },
  kindActive: {
    borderColor: 'rgba(255, 255, 255, 0.24)',
    backgroundColor: overviewColors.surfacePressed,
  },
  kindLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: overviewColors.textSecondary,
  },
  kindLabelActive: {
    color: overviewColors.textPrimary,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  amountInput: {
    flex: 1,
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: -1,
    color: overviewColors.textPrimary,
  },
  currencyInput: {
    minWidth: 72,
    textAlign: 'right',
    fontSize: 20,
    fontWeight: '600',
    color: overviewColors.textSecondary,
  },
  card: {
    overflow: 'hidden',
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: overviewColors.hairline,
    backgroundColor: overviewColors.surface,
  },
  separator: {
    marginLeft: 14,
    height: StyleSheet.hairlineWidth,
    backgroundColor: overviewColors.hairline,
  },
  field: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
  },
  fieldLabel: {
    width: 92,
    fontSize: 14,
    color: overviewColors.textSecondary,
  },
  fieldValue: {
    flex: 1,
    fontSize: 16,
    color: overviewColors.textSecondary,
  },
  fieldInput: {
    flex: 1,
    fontSize: 16,
    color: overviewColors.textPrimary,
  },
  error: {
    fontSize: 13,
    lineHeight: 18,
    color: overviewColors.negative,
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
