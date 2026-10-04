import { useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';

import { NamePrompt } from '@/features/app-shell/name-prompt';
import { SheetButton, SheetLayout, SheetRow, SheetSection } from '@/features/app-shell/sheet-layout';
import { useCopy } from '@/features/localization/language';
import { overviewColors } from '@/features/spending-overview/overview-theme';

import { builtInCategoryLabels, type CustomCategory } from './categories';
import { customCategoriesCopy } from './custom-categories-copy';
import { customCategoryNameError } from './custom-category';

interface CustomCategoriesScreenProps {
  categories: CustomCategory[];
  canCreate: boolean;
  onRequirePremium: () => void;
  onCreate: (name: string) => Promise<CustomCategory>;
  onRename: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
}

type Prompt = { kind: 'create' } | { kind: 'rename'; category: CustomCategory };

export function CustomCategoriesScreen({
  categories,
  canCreate,
  onRequirePremium,
  onCreate,
  onRename,
  onDelete,
  onClose,
}: CustomCategoriesScreenProps) {
  const copy = useCopy(customCategoriesCopy);
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const ordered = [...categories].sort((left, right) => left.name.localeCompare(right.name, 'pl'));

  const openActions = (category: CustomCategory) => {
    Alert.alert(copy.actionsTitle(category.name), undefined, [
      { text: copy.rename, onPress: () => setPrompt({ kind: 'rename', category }) },
      {
        style: 'destructive',
        text: copy.delete,
        onPress: () =>
          Alert.alert(copy.deleteTitle(category.name), copy.deleteBody, [
            { style: 'cancel', text: copy.cancel },
            { style: 'destructive', text: copy.delete, onPress: () => void onDelete(category.id) },
          ]),
      },
      { style: 'cancel', text: copy.cancel },
    ]);
  };

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
              onPress={() => openActions(category)}
            />
          ))}
        </SheetSection>
      )}

      <SheetSection label={copy.builtIn}>
        {builtInCategoryLabels().map((label, index) => (
          <SheetRow isFirst={index === 0} key={label} label={label} />
        ))}
      </SheetSection>

      <NamePrompt
        cancelLabel={copy.cancel}
        confirmLabel={prompt?.kind === 'rename' ? copy.save : copy.create}
        initialValue={prompt?.kind === 'rename' ? prompt.category.name : ''}
        onCancel={() => setPrompt(null)}
        onConfirm={async (name) => {
          if (prompt?.kind === 'rename') {
            await onRename(prompt.category.id, name);
          } else {
            await onCreate(name);
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
