import { SymbolView } from 'expo-symbols';
import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInRight, ReduceMotion } from 'react-native-reanimated';

import { ScalePressable } from '@/features/app-shell/scale-pressable';
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
  category: CategoryDetailTarget;
  merchants: HistoryMerchant[];
  rules: CategorizationRule[];
  onAssign: (merchant: HistoryMerchant) => Promise<void>;
  onUnassign: (merchantKey: string) => Promise<void>;
  onRename?: () => void;
  onDelete?: () => void;
  onBack: () => void;
  onClose: () => void;
}

interface BackButtonProps {
  label: string;
  onPress: () => void;
}

function BackButton({ label, onPress }: BackButtonProps) {
  return (
    <ScalePressable
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={8}
      onPress={() => {
        selectionChanged();
        onPress();
      }}
      pressedScale={0.88}
      style={styles.backButton}
    >
      <SymbolView
        name={{ ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }}
        size={17}
        tintColor={overviewColors.textPrimary}
      />
    </ScalePressable>
  );
}

export function CategoryDetailScreen({
  category,
  merchants,
  rules,
  onAssign,
  onUnassign,
  onRename,
  onDelete,
  onBack,
  onClose,
}: CategoryDetailScreenProps) {
  const copy = useCopy(customCategoriesCopy);
  const [isPicking, setIsPicking] = useState(false);
  const [query, setQuery] = useState('');
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
        leading={<BackButton label={copy.back} onPress={() => setIsPicking(false)} />}
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
                  key={merchant.key}
                  label={merchant.name}
                  onPress={() => {
                    impactLight();
                    void onAssign(merchant).then(() => {
                      setQuery('');
                      setIsPicking(false);
                    });
                  }}
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

        <SheetButton label={copy.addShop} onPress={() => setIsPicking(true)} tone="primary" />

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
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: overviewColors.surfacePressed,
  },
});
