import { useAndroidBack } from '@/features/app-shell/sheet/sheet-modal';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInRight, ReduceMotion } from 'react-native-reanimated';

import { useCopy } from '@/features/app-shell/localization/language';
import { BackButton } from '@/features/app-shell/sheet/back-button';
import { SheetButton } from '@/features/app-shell/sheet/components/sheet-button';
import { SheetLayout } from '@/features/app-shell/sheet/sheet-layout';
import { overviewColors, overviewSpacing } from '@/features/app-shell/theme/overview-theme';

import type { CategorizationRule } from '../../categorization-rule';
import type { HistoryMerchant } from '../../merchant-history';
import { customCategoriesCopy } from '../custom-categories-copy';
import { AssignedShops } from './components/assigned-shops';
import { MerchantPicker } from './components/merchant-picker';

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

  useAndroidBack(() => setIsPicking(false), isPicking, 1);

  if (isPicking) {
    return (
      <MerchantPicker
        candidates={candidates}
        onAssign={onAssign}
        onBack={() => setIsPicking(false)}
        onClose={onClose}
      />
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

        <AssignedShops assigned={assigned} countByKey={countByKey} onUnassign={onUnassign} />

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
});
