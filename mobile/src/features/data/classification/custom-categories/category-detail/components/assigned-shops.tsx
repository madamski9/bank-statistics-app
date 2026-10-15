import { Alert, StyleSheet, Text } from 'react-native';

import { useCopy } from '@/features/app-shell/localization/language';
import { SheetRow } from '@/features/app-shell/sheet/components/sheet-row';
import { SheetSection } from '@/features/app-shell/sheet/components/sheet-section';
import { overviewColors } from '@/features/app-shell/theme/overview-theme';

import type { CategorizationRule } from '../../../categorization-rule';
import { customCategoriesCopy } from '../../custom-categories-copy';

interface AssignedShopsProps {
  assigned: CategorizationRule[];
  countByKey: Map<string, number>;
  onUnassign: (merchantKey: string) => Promise<void>;
}

export function AssignedShops({ assigned, countByKey, onUnassign }: AssignedShopsProps) {
  const copy = useCopy(customCategoriesCopy);

  const confirmRemove = (rule: CategorizationRule) => {
    Alert.alert(copy.removeTitle(rule.merchantName), copy.removeBody, [
      { style: 'cancel', text: copy.cancel },
      { style: 'destructive', text: copy.remove, onPress: () => void onUnassign(rule.merchantKey) },
    ]);
  };

  if (assigned.length === 0) {
    return (
      <Text maxFontSizeMultiplier={1.5} style={styles.note}>
        {copy.noShops}
      </Text>
    );
  }

  return (
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
  );
}

const styles = StyleSheet.create({
  note: {
    fontSize: 14,
    lineHeight: 20,
    color: overviewColors.textSecondary,
  },
});
