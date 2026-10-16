import { memo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCopy } from '@/features/app-shell/localization/language';
import { overviewColors, overviewSpacing } from '@/features/app-shell/theme/overview-theme';
import type { SpendingDimension, SpendingGroup } from '@/features/data/classification/spending-groups';
import type { SpendingPeriod } from '@/features/home/overview/period/periods';

import { MerchantsHeader } from './components/merchants-header';
import { SpendingGroupRow } from './components/spending-group-row';
import { merchantsCopy } from './merchants-copy';

interface MerchantsScreenProps {
  groups: SpendingGroup[];
  dimension: SpendingDimension;
  onChangeDimension: (dimension: SpendingDimension) => void;
  period: SpendingPeriod;
  onChangePeriod: (period: SpendingPeriod) => void;
  lockedPeriods: ReadonlySet<SpendingPeriod>;
  onCreateLimit: () => void;
  onOpenCategories: () => void;
  onOpenIgnoredPayments: () => void;
  onSelectGroup: (group: SpendingGroup) => void;
  error: string | null;
  isLoading: boolean;
}

function MerchantsScreenComponent({ groups, onSelectGroup, error, isLoading, ...header }: MerchantsScreenProps) {
  const insets = useSafeAreaInsets();
  const copy = useCopy(merchantsCopy);
  const { dimension } = header;

  const emptyMessage =
    error !== null
      ? error
      : isLoading
        ? copy.loading
        : copy.empty[dimension];

  return (
    <View style={styles.page}>
      <MerchantsHeader {...header} groupTotal={groups.length} />

      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
        indicatorStyle="white"
      >
        {groups.length === 0 ? (
          <Text
            maxFontSizeMultiplier={1.6}
            style={[styles.empty, error !== null ? styles.error : null]}
          >
            {emptyMessage}
          </Text>
        ) : (
          groups.map((group, index) => (
            <SpendingGroupRow
              dimension={dimension}
              group={group}
              key={group.key}
              onPress={() => onSelectGroup(group)}
              rank={index + 1}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

export const MerchantsScreen = memo(MerchantsScreenComponent);

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  list: {
    gap: 4,
    paddingHorizontal: overviewSpacing.gutter,
    paddingTop: overviewSpacing.tight,
  },
  empty: {
    paddingTop: overviewSpacing.block,
    fontSize: 14,
    lineHeight: 20,
    color: overviewColors.textSecondary,
  },
  error: {
    color: overviewColors.negative,
  },
});
