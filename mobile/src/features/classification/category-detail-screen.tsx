import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInRight, FadeOutDown, ReduceMotion } from 'react-native-reanimated';

import { BackButton } from '@/features/app-shell/back-button';
import { SheetButton, SheetLayout, SheetRow, SheetSection } from '@/features/app-shell/sheet-layout';
import { useCopy } from '@/features/localization/language';
import { overviewColors, overviewSpacing } from '@/features/spending-overview/overview-theme';
import { impactLight, selectionChanged } from '@/haptics';

import type { CategorizationRule } from './categorization-rule';
import { customCategoriesCopy } from './custom-categories-copy';
import { matchesMerchantQuery, type HistoryMerchant } from './merchant-history';

const pickerRowLimit = 80;

export interface CategoryDetailTarget {
  id: string;
  label: string;
  isCustom: boolean;
}

interface CategoryDetailScreenProps {
  canAssign: boolean;
  category: CategoryDetailTarget;
  merchants: HistoryMerchant[];
  rules: CategorizationRule[];
  onAssign: (merchants: HistoryMerchant[]) => Promise<boolean>;
  onRequirePremium: () => void;
  onUnassign: (merchantKey: string) => Promise<void>;
  onRename?: () => void;
  onDelete?: () => void;
  onBack: () => void;
  onClose: () => void;
}

export function CategoryDetailScreen({
  canAssign,
  category,
  merchants,
  rules,
  onAssign,
  onRequirePremium,
  onUnassign,
  onRename,
  onDelete,
  onBack,
  onClose,
}: CategoryDetailScreenProps) {
  const copy = useCopy(customCategoriesCopy);
  const [isPicking, setIsPicking] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedKeys, setSelectedKeys] = useState<ReadonlySet<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const assigned = useMemo(
    () =>
      rules
        .filter((rule) => rule.category === category.id)
        .sort((left, right) => left.merchantName.localeCompare(right.merchantName, 'pl')),
    [category.id, rules],
  );
  const assignedKeys = useMemo(() => new Set(assigned.map((rule) => rule.merchantKey)), [assigned]);
  const countByKey = useMemo(
    () => new Map(merchants.map((merchant) => [merchant.key, merchant.count])),
    [merchants],
  );
  const candidates = useMemo(
    () => merchants.filter((merchant) => !assignedKeys.has(merchant.key)),
    [assignedKeys, merchants],
  );
  const matching = useMemo(
    () => candidates.filter((merchant) => matchesMerchantQuery(merchant, query)).slice(0, pickerRowLimit),
    [candidates, query],
  );

  const closePicker = () => {
    setQuery('');
    setSelectedKeys(new Set());
    setIsPicking(false);
  };

  const toggle = (key: string) => {
    selectionChanged();
    setSelectedKeys((current) => {
      const next = new Set(current);

      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }

      return next;
    });
  };

  const assignSelected = () => {
    const picked = candidates.filter((merchant) => selectedKeys.has(merchant.key));

    if (picked.length === 0 || isSaving) {
      return;
    }

    impactLight();
    setIsSaving(true);
    void onAssign(picked)
      .then((saved) => {
        if (saved) {
          closePicker();
        }
      })
      .finally(() => setIsSaving(false));
  };

  const confirmRemove = (rule: CategorizationRule) => {
    Alert.alert(copy.removeTitle(rule.merchantName), copy.removeBody, [
      { style: 'cancel', text: copy.cancel },
      { style: 'destructive', text: copy.remove, onPress: () => void onUnassign(rule.merchantKey) },
    ]);
  };

  if (isPicking) {
    return (
      <SheetLayout
        closeLabel={copy.close}
        footer={
          selectedKeys.size > 0 ? (
            <Animated.View
              entering={FadeInDown.duration(220).reduceMotion(ReduceMotion.System)}
              exiting={FadeOutDown.duration(160).reduceMotion(ReduceMotion.System)}
            >
              <SheetButton
                disabled={isSaving}
                label={copy.addSelected(selectedKeys.size)}
                onPress={assignSelected}
                tone="primary"
              />
            </Animated.View>
          ) : undefined
        }
        leading={<BackButton label={copy.back} onPress={closePicker} />}
        onClose={onClose}
        title={copy.pickTitle}
      >
        <TextInput
          accessibilityLabel={copy.searchPlaceholder}
          autoCorrect={false}
          clearButtonMode="while-editing"
          onChangeText={setQuery}
          placeholder={copy.searchPlaceholder}
          placeholderTextColor={overviewColors.textDisabled}
          returnKeyType="search"
          selectionColor={overviewColors.textPrimary}
          style={styles.search}
          value={query}
        />
        {candidates.length === 0 || matching.length === 0 ? (
          <Text maxFontSizeMultiplier={1.5} style={styles.note}>
            {candidates.length === 0 ? copy.noHistory : copy.noMatch}
          </Text>
        ) : (
          <Animated.View entering={FadeIn.duration(200).reduceMotion(ReduceMotion.System)}>
            <SheetSection>
              {matching.map((merchant, index) => (
                <SheetRow
                  accessibilityHint={copy.assignHint}
                  detail={copy.currently(merchant.categoryName, copy.payments(merchant.count))}
                  isFirst={index === 0}
                  isSelected={selectedKeys.has(merchant.key)}
                  key={merchant.key}
                  label={merchant.name}
                  onPress={() => toggle(merchant.key)}
                />
              ))}
            </SheetSection>
          </Animated.View>
        )}
      </SheetLayout>
    );
  }

  return (
    <SheetLayout
      closeLabel={copy.close}
      leading={<BackButton label={copy.back} onPress={onBack} />}
      onClose={onClose}
      title={category.label}
    >
      <Animated.View
        entering={FadeInRight.duration(260).reduceMotion(ReduceMotion.System)}
        style={styles.content}
      >
        <Text maxFontSizeMultiplier={1.5} style={styles.note}>
          {copy.shopsIntro}
        </Text>

        <SheetButton
          label={copy.addShop}
          onPress={() => (canAssign ? setIsPicking(true) : onRequirePremium())}
          tone="primary"
        />

        {assigned.length === 0 ? (
          <Text maxFontSizeMultiplier={1.5} style={styles.note}>
            {copy.noShops}
          </Text>
        ) : (
          <SheetSection label={copy.shops}>
            {assigned.map((rule, index) => {
              const count = countByKey.get(rule.merchantKey);

              return (
                <SheetRow
                  accessibilityHint={copy.removeHint}
                  detail={count === undefined ? undefined : copy.payments(count)}
                  isFirst={index === 0}
                  key={rule.merchantKey}
                  label={rule.merchantName}
                  onPress={() => confirmRemove(rule)}
                />
              );
            })}
          </SheetSection>
        )}

        {category.isCustom && onRename !== undefined && onDelete !== undefined ? (
          <View style={styles.manage}>
            <SheetButton label={copy.rename} onPress={onRename} />
            <SheetButton label={copy.deleteCategory} onPress={onDelete} tone="danger" />
          </View>
        ) : null}
      </Animated.View>
    </SheetLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: overviewSpacing.section,
  },
  manage: {
    gap: overviewSpacing.tight,
  },
  note: {
    fontSize: 14,
    lineHeight: 20,
    color: overviewColors.textSecondary,
  },
  search: {
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: 14,
    fontSize: 17,
    color: overviewColors.textPrimary,
    backgroundColor: overviewColors.surfacePressed,
  },
});
