import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useCopy } from '@/features/app-shell/localization/language';
import { overviewColors } from '@/features/app-shell/theme/overview-theme';
import { selectionChanged } from '@/haptics';

import { alertsCopy } from '../../alerts-copy';
import type { AlertScope } from '../../rules/alert-rule';
import { FormLabel } from './form-field';

type MerchantScope = Extract<AlertScope, { kind: 'merchant' }>;

const merchantRowHeight = 48;
const merchantRowGap = 8;
const visibleMerchantRows = 3;

interface ScopePickerProps {
  initialScope: AlertScope;
  merchants: MerchantScope[];
  selectedScope: AlertScope;
  onSelect: (scope: AlertScope) => void;
}

export function ScopePicker({ initialScope, merchants, selectedScope, onSelect }: ScopePickerProps) {
  const copy = useCopy(alertsCopy);
  const [merchantSearch, setMerchantSearch] = useState('');
  const merchantListRef = useRef<ScrollView>(null);
  const availableMerchants =
    initialScope.kind === 'merchant'
      ? [initialScope, ...merchants.filter((merchant) => merchant.key !== initialScope.key)]
      : merchants;
  const visibleMerchants = availableMerchants
    .filter((merchant) =>
      merchant.name.toLocaleLowerCase('pl').includes(merchantSearch.trim().toLocaleLowerCase('pl')),
    );

  useEffect(() => {
    merchantListRef.current?.flashScrollIndicators();
  }, []);

  return (
    <View style={styles.merchantSection}>
      <FormLabel>{copy.scopeSection}</FormLabel>
      <TextInput
        accessibilityLabel={copy.searchShop}
        autoCapitalize="none"
        onChangeText={setMerchantSearch}
        placeholder={copy.searchPlaceholder}
        placeholderTextColor={overviewColors.textDisabled}
        selectionColor={overviewColors.textPrimary}
        style={styles.merchantSearch}
        value={merchantSearch}
      />
      <ScopeOption
        isSelected={selectedScope.kind === 'all'}
        label={copy.allSpendingOption}
        onPress={() => onSelect({ kind: 'all' })}
      />
      {visibleMerchants.length > 0 ? (
        <ScrollView
          contentContainerStyle={styles.merchantListContent}
          indicatorStyle="white"
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          persistentScrollbar
          ref={merchantListRef}
          style={styles.merchantList}
        >
          {visibleMerchants.map((merchant) => (
            <ScopeOption
              isSelected={selectedScope.kind === 'merchant' && selectedScope.key === merchant.key}
              key={merchant.key}
              label={merchant.name}
              onPress={() => onSelect(merchant)}
            />
          ))}
        </ScrollView>
      ) : null}
      {merchants.length === 0 ? (
        <Text style={styles.note}>{copy.noMerchants}</Text>
      ) : visibleMerchants.length === 0 ? (
        <Text style={styles.note}>{copy.noMatchingMerchant}</Text>
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
