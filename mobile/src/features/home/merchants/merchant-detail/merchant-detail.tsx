import type { IngestionRecord } from '@bankstats/ingestion-native';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { overviewColors, overviewSpacing } from '@/features/app-shell/theme/overview-theme';
import type { CategorizationRule } from '@/features/data/classification/categorization-rule';
import type { SpendingGroup } from '@/features/data/classification/spending-groups';
import { periodWindow, type SpendingPeriod } from '@/features/home/overview/period/periods';
import { RangeSwitcher } from '@/features/home/overview/period/range-switcher';
import type { GroupLimit } from '@/features/insights/alerts/rules/group-limit';

import { DailySpendChart } from './components/daily-spend-chart';
import { GroupLimitCard, SetLimitButton } from './components/group-limit-card';
import { MerchantHeader } from './components/merchant-header';
import { MerchantHistory } from './components/merchant-history';
import { groupInWindow, merchantDetailPeriods } from './merchant-period';
import { spendBuckets } from './merchant-summary';
import { useDetailSheetMotion } from './use-detail-sheet-motion';

interface MerchantDetailProps {
  group: SpendingGroup;
  records: IngestionRecord[];
  rules: CategorizationRule[];
  limit: GroupLimit | null;
  onEditLimit: () => void;
  period: SpendingPeriod;
  lockedPeriods: ReadonlySet<SpendingPeriod>;
  onRequirePremium: () => void;
  onClosed: () => void;
}

export function MerchantDetail({
  group: openedGroup,
  records,
  rules,
  limit,
  onEditLimit,
  period: initialPeriod,
  lockedPeriods,
  onRequirePremium,
  onClosed,
}: MerchantDetailProps) {
  const insets = useSafeAreaInsets();
  const motion = useDetailSheetMotion(onClosed);
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);
  const [period, setPeriod] = useState(initialPeriod);

  const spendWindow = useMemo(() => periodWindow(period, new Date()), [period]);
  const group = useMemo(
    () => groupInWindow(openedGroup, records, spendWindow, rules),
    [openedGroup, records, rules, spendWindow],
  );
  const buckets = useMemo(
    () => spendBuckets(group.records, spendWindow, period),
    [group.records, period, spendWindow],
  );

  const changePeriod = (next: SpendingPeriod) => {
    if (lockedPeriods.has(next)) {
      onRequirePremium();
      return;
    }

    setSelectedBucket(null);
    setPeriod(next);
  };

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <Animated.View pointerEvents="none" style={[styles.scrim, motion.scrimStyle]} />
      <Animated.View
        style={[styles.sheet, { paddingTop: insets.top + 6 }, motion.sheetStyle]}
      >
        <GestureDetector gesture={motion.pan}>
          <Animated.View>
            <MerchantHeader group={group} onClose={motion.requestClose} period={period} />
          </Animated.View>
        </GestureDetector>

        <ScrollView
          contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 32 }]}
          indicatorStyle="white"
        >
          <RangeSwitcher
            lockedPeriods={lockedPeriods}
            onChange={changePeriod}
            period={period}
            periods={merchantDetailPeriods}
          />

          {limit !== null ? (
            <GroupLimitCard limit={limit} onEdit={onEditLimit} />
          ) : openedGroup.records.some((record) => record.currency === 'PLN') ? (
            <SetLimitButton onPress={onEditLimit} />
          ) : null}

          {buckets.length > 0 ? (
            <DailySpendChart
              buckets={buckets}
              currency={group.currency}
              onSelect={setSelectedBucket}
              selectedKey={selectedBucket}
            />
          ) : null}

          <MerchantHistory records={group.records} rules={rules} showsParty={group.dimension === 'category'} />
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: overviewColors.scrim,
  },
  sheet: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: overviewColors.background,
  },
  body: {
    gap: overviewSpacing.section,
    paddingHorizontal: overviewSpacing.gutter,
    paddingTop: overviewSpacing.tight,
  },
});
