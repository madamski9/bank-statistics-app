import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { languageLocales, useCopy, useLanguage } from '@/features/app-shell/localization/language';
import { overviewColors } from '@/features/app-shell/theme/overview-theme';
import { selectionChanged } from '@/haptics';

import { alertsCopy } from '../../alerts-copy';
import { scopeLabel } from '../../delivery/alert-message';
import type { AlertScope } from '../../rules/alert-rule';
import { categoryScopeOptions } from '../../rules/category-options';
import { FormLabel } from './form-field';
import { OptionChips } from './option-chips';

type MerchantScope = Extract<AlertScope, { kind: 'merchant' }>;

type ScopeListKind = 'merchant' | 'category';

const scopeListKinds: ScopeListKind[] = ['merchant', 'category'];

const merchantRowHeight = 48;
const merchantRowGap = 8;
const visibleMerchantRows = 3;

interface ScopePickerProps {
  initialScope: AlertScope;
  merchants: MerchantScope[];
  includesCustomCategories: boolean;
  selectedScope: AlertScope;
  onSelect: (scope: AlertScope) => void;
}

interface ScopeListItem {
  key: string;
  label: string;
  scope: AlertScope;
  isSelected: boolean;
}

function matchesSearch(label: string, search: string, locale: string): boolean {
  return label.toLocaleLowerCase(locale).includes(search.trim().toLocaleLowerCase(locale));
}

export function ScopePicker({
  initialScope,
  merchants,
  includesCustomCategories,
  selectedScope,
  onSelect,
}: ScopePickerProps) {
  const copy = useCopy(alertsCopy);
  const language = useLanguage();
  const locale = languageLocales[language];
  const [listKind, setListKind] = useState<ScopeListKind>(
    initialScope.kind === 'category' ? 'category' : 'merchant',
  );
  const [search, setSearch] = useState('');
  const listRef = useRef<ScrollView>(null);
  const categories = useMemo(
    () => categoryScopeOptions(includesCustomCategories, initialScope, language),
    [includesCustomCategories, initialScope, language],
  );
  const availableMerchants =
    initialScope.kind === 'merchant'
      ? [initialScope, ...merchants.filter((merchant) => merchant.key !== initialScope.key)]
      : merchants;
  const items: ScopeListItem[] =
    listKind === 'merchant'
      ? availableMerchants.map((merchant) => ({
          key: merchant.key,
          label: merchant.name,
          scope: merchant,
          isSelected: selectedScope.kind === 'merchant' && selectedScope.key === merchant.key,
        }))
      : categories.map((category) => ({
          key: category.scope.id,
          label: category.label,
          scope: category.scope,
          isSelected: selectedScope.kind === 'category' && selectedScope.id === category.scope.id,
        }));
  const visibleItems = items.filter((item) => matchesSearch(item.label, search, locale));
  const isSelectedElsewhere = selectedScope.kind !== 'all' && selectedScope.kind !== listKind;

  const changeList = (next: ScopeListKind) => {
    setListKind(next);
    setSearch('');
  };

  useEffect(() => {
    listRef.current?.flashScrollIndicators();
  }, [listKind]);

  return (
    <View style={styles.merchantSection}>
      <FormLabel>{copy.scopeSection}</FormLabel>
      <OptionChips
        onSelect={changeList}
        options={scopeListKinds.map((value) => ({ key: value, value, label: copy.scopeLists[value] }))}
        selected={listKind}
      />
      <TextInput
        accessibilityLabel={listKind === 'merchant' ? copy.searchShop : copy.searchCategory}
        autoCapitalize="none"
        onChangeText={setSearch}
        placeholder={listKind === 'merchant' ? copy.searchPlaceholder : copy.searchCategory}
        placeholderTextColor={overviewColors.textDisabled}
        selectionColor={overviewColors.textPrimary}
        style={styles.merchantSearch}
        value={search}
      />
      {isSelectedElsewhere ? (
        <Text maxFontSizeMultiplier={1.5} numberOfLines={2} style={styles.note}>
          {copy.selectedScope(scopeLabel(selectedScope))}
        </Text>
      ) : null}
      <ScopeOption
        isSelected={selectedScope.kind === 'all'}
        label={copy.allSpendingOption}
        onPress={() => onSelect({ kind: 'all' })}
      />
      {visibleItems.length > 0 ? (
        <ScrollView
          contentContainerStyle={styles.merchantListContent}
          indicatorStyle="white"
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          persistentScrollbar
          ref={listRef}
          style={styles.merchantList}
        >
          {visibleItems.map((item) => (
            <ScopeOption
              isSelected={item.isSelected}
              key={item.key}
              label={item.label}
              onPress={() => onSelect(item.scope)}
            />
          ))}
        </ScrollView>
      ) : null}
      {listKind === 'merchant' && items.length === 0 ? (
        <Text style={styles.note}>{copy.noMerchants}</Text>
      ) : visibleItems.length === 0 ? (
        <Text style={styles.note}>{listKind === 'merchant' ? copy.noMatchingMerchant : copy.noMatchingCategory}</Text>
      ) : null}
    </View>
  );
}

interface ScopeOptionProps {
  label: string;
  isSelected: boolean;
  onPress: () => void;
}

function ScopeOption({ label, isSelected, onPress }: ScopeOptionProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: isSelected }}
      onPress={() => {
        selectionChanged();
        onPress();
      }}
      style={({ pressed }) => [styles.merchantOption, pressed ? styles.pressed : null]}
    >
      <Text maxFontSizeMultiplier={1.5} numberOfLines={1} style={styles.merchantOptionLabel}>{label}</Text>
      {isSelected ? <Text style={styles.selectedMark}>✓</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  merchantSection: {
    gap: 8,
  },
  merchantSearch: {
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: overviewColors.surface,
    color: overviewColors.textPrimary,
    fontSize: 16,
  },
  merchantList: {
    maxHeight: merchantRowHeight * visibleMerchantRows + merchantRowGap * (visibleMerchantRows - 1),
  },
  merchantListContent: {
    gap: merchantRowGap,
  },
  merchantOption: {
    minHeight: merchantRowHeight,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: overviewColors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  merchantOptionLabel: {
    flex: 1,
    color: overviewColors.textPrimary,
    fontSize: 15,
  },
  selectedMark: {
    color: overviewColors.positive,
    fontSize: 17,
    fontWeight: '700',
  },
  note: {
    fontSize: 13,
    lineHeight: 18,
    color: overviewColors.textSecondary,
  },
  pressed: {
    opacity: 0.6,
  },
});
