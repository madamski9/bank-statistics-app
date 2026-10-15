import type { IngestionRecord } from '@bankstats/ingestion-native';
import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';

import { NamePrompt } from '@/features/app-shell/name-prompt';
import { SheetButton, SheetLayout, SheetRow, SheetSection } from '@/features/app-shell/sheet-layout';
import { useCopy } from '@/features/localization/language';
import { overviewColors } from '@/features/spending-overview/overview-theme';
import { selectionChanged } from '@/haptics';

import { categoryOptions, isCustomCategoryId, type CustomCategory } from './categories';
import type { CategorizationRule } from './categorization-rule';
import { CategoryDetailScreen, type CategoryDetailTarget } from './category-detail-screen';
import { customCategoriesCopy } from './custom-categories-copy';
import { customCategoryNameError } from './custom-category';
import { merchantHistory } from './merchant-history';
import type { AssignedMerchant } from './use-categorization-rules';

interface CustomCategoriesScreenProps {
  categories: CustomCategory[];
  records: IngestionRecord[];
  rules: CategorizationRule[];
  canCreate: boolean;
  canAssignMerchant: boolean;
  onRequirePremium: () => void;
  onCreate: (name: string) => Promise<CustomCategory>;
  onRename: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onAssignMerchants: (merchants: AssignedMerchant[], category: string) => Promise<boolean>;
  onForgetMerchant: (merchantKey: string) => Promise<void>;
  onClose: () => void;
}

type Prompt = { kind: 'create' } | { kind: 'rename'; category: CustomCategory };

export function CustomCategoriesScreen({
  categories,
  records,
  rules,
  canCreate,
  canAssignMerchant,
  onRequirePremium,
  onCreate,
  onRename,
  onDelete,
  onAssignMerchants,
  onForgetMerchant,
  onClose,
}: CustomCategoriesScreenProps) {
  const copy = useCopy(customCategoriesCopy);
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [openedId, setOpenedId] = useState<string | null>(null);
  const ordered = [...categories].sort((left, right) => left.name.localeCompare(right.name, 'pl'));
  const builtIn = categoryOptions().filter((option) => !isCustomCategoryId(option.id));
  const merchants = useMemo(() => merchantHistory(records, rules), [records, rules]);
  const shopCounts = useMemo(() => {
    const counts = new Map<string, number>();

    for (const rule of rules) {
      counts.set(rule.category, (counts.get(rule.category) ?? 0) + 1);
    }

    return counts;
  }, [rules]);
  const openedCustom = ordered.find((category) => category.id === openedId);
  const openedBuiltIn = builtIn.find((option) => option.id === openedId);
  const opened: CategoryDetailTarget | null = openedCustom !== undefined
    ? { id: openedCustom.id, label: openedCustom.name, isCustom: true }
    : openedBuiltIn !== undefined
      ? { id: openedBuiltIn.id, label: openedBuiltIn.label, isCustom: false }
      : null;

  const open = (id: string) => {
    selectionChanged();
    setOpenedId(id);
  };

  const confirmDelete = (category: CustomCategory) => {
    Alert.alert(copy.deleteTitle(category.name), copy.deleteBody, [
      { style: 'cancel', text: copy.cancel },
      {
        style: 'destructive',
        text: copy.delete,
        onPress: () =>
          void onDelete(category.id).then(() => setOpenedId(null)),
      },
    ]);
  };

  const shopCountValue = (id: string) => {
    const count = shopCounts.get(id) ?? 0;

    return count === 0 ? undefined : String(count);
  };

  const namePrompt = (
    <NamePrompt
      cancelLabel={copy.cancel}
      confirmLabel={prompt?.kind === 'rename' ? copy.save : copy.create}
      initialValue={prompt?.kind === 'rename' ? prompt.category.name : ''}
      onCancel={() => setPrompt(null)}
      onConfirm={async (name) => {
        if (prompt?.kind === 'rename') {
          await onRename(prompt.category.id, name);
        } else {
          const created = await onCreate(name);
          setOpenedId(created.id);
        }

        setPrompt(null);
      }}
      placeholder={copy.placeholder}
      title={prompt?.kind === 'rename' ? copy.renameTitle : copy.addTitle}
      validate={(name) =>
        customCategoryNameError(name, categories, prompt?.kind === 'rename' ? prompt.category.id : null)
      }
      visible={prompt !== null}
    />
  );

  if (opened !== null) {
    return (
      <>
        <CategoryDetailScreen
          canAssign={canAssignMerchant}
          category={opened}
          merchants={merchants}
          onAssign={(picked) => onAssignMerchants(picked, opened.id)}
          onBack={() => setOpenedId(null)}
          onClose={onClose}
          onDelete={openedCustom === undefined ? undefined : () => confirmDelete(openedCustom)}
          onRename={
            openedCustom === undefined ? undefined : () => setPrompt({ kind: 'rename', category: openedCustom })
          }
          onRequirePremium={onRequirePremium}
          onUnassign={onForgetMerchant}
          rules={rules}
        />
        {namePrompt}
      </>
    );
  }

  return (
    <SheetLayout closeLabel={copy.close} onClose={onClose} title={copy.title}>
      <SheetButton
        label={copy.add}
        onPress={() => (canCreate ? setPrompt({ kind: 'create' }) : onRequirePremium())}
        tone="primary"
      />

      {ordered.length === 0 ? (
        <Text maxFontSizeMultiplier={1.5} style={styles.note}>
          {canCreate ? copy.empty : `${copy.empty} ${copy.premiumFootnote}`}
        </Text>
      ) : (
        <SheetSection label={copy.yours}>
          {ordered.map((category, index) => (
            <SheetRow
              accessibilityHint={copy.editHint}
              isFirst={index === 0}
              key={category.id}
              label={category.name}
              onPress={() => open(category.id)}
              value={shopCountValue(category.id)}
              valueTone="muted"
            />
          ))}
        </SheetSection>
      )}

      <SheetSection label={copy.builtIn}>
        {builtIn.map((option, index) => (
          <SheetRow
            accessibilityHint={copy.editHint}
            isFirst={index === 0}
            key={option.id}
            label={option.label}
            onPress={() => open(option.id)}
            value={shopCountValue(option.id)}
            valueTone="muted"
          />
        ))}
      </SheetSection>

      {namePrompt}
    </SheetLayout>
  );
}

const styles = StyleSheet.create({
  note: {
    fontSize: 14,
    lineHeight: 20,
    color: overviewColors.textSecondary,
  },
});
