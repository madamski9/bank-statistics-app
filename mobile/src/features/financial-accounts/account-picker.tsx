import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { impactLight, selectionChanged } from '@/haptics';
import { useCopy } from '@/features/localization/language';
import { overviewColors } from '@/features/spending-overview/overview-theme';

import {
  accountNameError,
  maximumAccountNameLength,
  type FinancialAccount,
} from './financial-account';
import { financialAccountsCopy } from './financial-accounts-copy';

interface AccountPickerProps {
  accounts: FinancialAccount[];
  selectedId: string;
  onSelect: (accountId: string) => void;
  onCreate: (name: string) => Promise<void>;
}

export function AccountPicker({ accounts, selectedId, onSelect, onCreate }: AccountPickerProps) {
  const copy = useCopy(financialAccountsCopy);
  const [newName, setNewName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (newName === null) {
      return;
    }

    const invalid = accountNameError(newName, accounts);

    if (invalid !== null) {
      setError(invalid);

      return;
    }

    setIsCreating(true);

    try {
      await onCreate(newName);
      impactLight();
      setNewName(null);
      setError(null);
    } catch {
      setError(copy.addFailed);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <View style={styles.section}>
      <Text maxFontSizeMultiplier={1.4} style={styles.sectionLabel}>
        {copy.account}
      </Text>
      <View style={styles.chips}>
        {accounts.map((account) => {
          const isActive = account.id === selectedId;

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              key={account.id}
              onPress={() => {
                selectionChanged();
                onSelect(account.id);
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
                {account.name}
              </Text>
            </Pressable>
          );
        })}
        {newName === null ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              selectionChanged();
              setNewName('');
            }}
            style={({ pressed }) => [styles.chip, pressed ? styles.pressed : null]}
          >
            <Text maxFontSizeMultiplier={1.3} style={styles.chipLabel}>
              {copy.newAccount}
            </Text>
          </Pressable>
        ) : null}
      </View>
      {newName !== null ? (
        <View style={styles.card}>
          <View style={styles.field}>
            <TextInput
              accessibilityLabel={copy.newAccountName}
              autoFocus
              maxLength={maximumAccountNameLength}
              onChangeText={(value) => {
                setError(null);
                setNewName(value);
              }}
              onSubmitEditing={() => void handleCreate()}
              placeholder={copy.namePlaceholder}
              placeholderTextColor={overviewColors.textDisabled}
              returnKeyType="done"
              selectionColor={overviewColors.textPrimary}
              style={styles.fieldInput}
              value={newName}
            />
            <Pressable
              accessibilityRole="button"
              disabled={isCreating}
              hitSlop={8}
              onPress={() => void handleCreate()}
              style={({ pressed }) => [pressed ? styles.pressed : null]}
            >
              {isCreating ? (
                <ActivityIndicator color={overviewColors.textPrimary} />
              ) : (
                <Text maxFontSizeMultiplier={1.3} style={styles.addLabel}>
                  {copy.add}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      ) : null}
      {error !== null ? (
        <Text accessibilityLiveRegion="polite" maxFontSizeMultiplier={1.5} style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
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
  card: {
    overflow: 'hidden',
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: overviewColors.hairline,
    backgroundColor: overviewColors.surface,
  },
  field: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
  },
  fieldInput: {
    flex: 1,
    fontSize: 16,
    color: overviewColors.textPrimary,
  },
  addLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: overviewColors.textPrimary,
  },
  error: {
    fontSize: 13,
    lineHeight: 18,
    color: overviewColors.negative,
  },
  pressed: {
    opacity: 0.6,
  },
});
