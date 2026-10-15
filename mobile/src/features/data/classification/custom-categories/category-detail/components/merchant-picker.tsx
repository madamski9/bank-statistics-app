import { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOutDown, ReduceMotion } from 'react-native-reanimated';

import { useCopy } from '@/features/app-shell/localization/language';
import { BackButton } from '@/features/app-shell/sheet/back-button';
import { SheetButton } from '@/features/app-shell/sheet/components/sheet-button';
import { SheetRow } from '@/features/app-shell/sheet/components/sheet-row';
import { SheetSection } from '@/features/app-shell/sheet/components/sheet-section';
import { SheetLayout } from '@/features/app-shell/sheet/sheet-layout';
import { overviewColors } from '@/features/app-shell/theme/overview-theme';
import { impactLight, selectionChanged } from '@/haptics';

import { matchesMerchantQuery, type HistoryMerchant } from '../../../merchant-history';
import { customCategoriesCopy } from '../../custom-categories-copy';

const pickerRowLimit = 80;

interface MerchantPickerProps {
  candidates: HistoryMerchant[];
  onAssign: (merchants: HistoryMerchant[]) => Promise<boolean>;
  onBack: () => void;
  onClose: () => void;
}

export function MerchantPicker({ candidates, onAssign, onBack, onClose }: MerchantPickerProps) {
  const copy = useCopy(customCategoriesCopy);
  const [query, setQuery] = useState('');
  const [selectedKeys, setSelectedKeys] = useState<ReadonlySet<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const matching = useMemo(
    () => candidates.filter((merchant) => matchesMerchantQuery(merchant, query)).slice(0, pickerRowLimit),
    [candidates, query],
  );

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
          onBack();
        }
      })
      .finally(() => setIsSaving(false));
  };

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
      leading={<BackButton label={copy.back} onPress={onBack} />}
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

const styles = StyleSheet.create({
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
