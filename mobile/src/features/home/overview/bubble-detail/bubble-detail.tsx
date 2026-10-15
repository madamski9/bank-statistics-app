import { StyleSheet } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCopy } from '@/features/app-shell/localization/language';
import { bubbleTints, overviewColors } from '@/features/app-shell/theme/overview-theme';
import { useAmountFormatting } from '@/features/settings/privacy/amounts/use-private-amounts';

import type { BubbleSelection } from '../bubbles/bubble-selection';
import { BubbleSkin } from '../bubbles/bubble-skin';
import type { SpendingPeriod } from '../period/periods';
import { spendingOverviewCopy } from '../spending-overview-copy';
import type { SpendingSource, SpendingSummary } from '../spending/spending-summary';
import type { SpendingTrend } from '../spending/spending-trend';
import { DetailContent } from './components/detail-content';
import { DetailHeader } from './components/detail-header';
import { TintedScrollView } from './components/tinted-scroll-view';
import { useBubbleDetailMotion } from './use-bubble-detail-motion';

interface BubbleDetailProps {
  selection: BubbleSelection;
  summary: SpendingSummary;
  trend: SpendingTrend;
  change: number | null;
  period: SpendingPeriod;
  onChangePeriod: (period: SpendingPeriod) => void;
  lockedPeriods: ReadonlySet<SpendingPeriod>;
  onSelectSource: (source: SpendingSource) => void;
  onClosed: () => void;
}

const horizontalPadding = 20;

export function BubbleDetail({
  selection,
  summary,
  trend,
  change,
  period,
  onChangePeriod,
  lockedPeriods,
  onSelectSource,
  onClosed,
}: BubbleDetailProps) {
  const { formatAmount, formatSignedAmount } = useAmountFormatting();
  const copy = useCopy(spendingOverviewCopy);
  const insets = useSafeAreaInsets();
  const { key, origin } = selection;
  const tint = bubbleTints[key];
  const motion = useBubbleDetailMotion(origin, onClosed);

  const amountMinor =
    key === 'expense' ? summary.expenseMinor : key === 'income' ? summary.incomeMinor : summary.netMinor;
  const amount =
    key === 'net'
      ? formatSignedAmount(summary.netMinor, summary.currency)
      : formatAmount(amountMinor, summary.currency);
  const isChangeWelcome = change === null ? true : key === 'expense' ? change < 0 : change > 0;

  return (
    <Animated.View
      accessibilityViewIsModal
      onAccessibilityEscape={motion.requestClose}
      style={[StyleSheet.absoluteFill, motion.overlayStyle]}
    >
      <Animated.View pointerEvents="none" style={[styles.scrim, motion.scrimStyle]} />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.film,
          {
            left: origin.x - origin.size / 2,
            top: origin.y - origin.size / 2,
            width: origin.size,
            height: origin.size,
            borderRadius: origin.size / 2,
            backgroundColor: `rgba(${tint.rgb}, 0.05)`,
          },
          motion.filmStyle,
        ]}
      >
        <Animated.View style={[styles.film, styles.skin, motion.skinStyle]}>
          <BubbleSkin size={origin.size} tint={tint} />
        </Animated.View>
      </Animated.View>

      <Animated.View
        style={[
          styles.content,
          { paddingTop: insets.top + 6, paddingBottom: insets.bottom },
          motion.contentStyle,
        ]}
      >
        <GestureDetector gesture={motion.pan}>
          <Animated.View>
            <DetailHeader
              amount={amount}
              change={change}
              isChangeWelcome={isChangeWelcome}
              lockedPeriods={lockedPeriods}
              onChangePeriod={onChangePeriod}
              onClose={motion.requestClose}
              period={period}
              title={copy.titles[key]}
            />
          </Animated.View>
        </GestureDetector>

        <TintedScrollView
          color={tint.film}
          contentContainerStyle={styles.listContent}
          style={styles.list}
        >
          {motion.contentReady ? (
            <DetailContent
              bubbleKey={key}
              onSelectSource={onSelectSource}
              period={period}
              summary={summary}
              trend={trend}
            />
          ) : null}
        </TintedScrollView>
      </Animated.View>
    </Animated.View>
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
  film: {
    position: 'absolute',
  },
  skin: {
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: horizontalPadding,
  },
  list: {
    flex: 1,
    marginHorizontal: -horizontalPadding,
  },
  listContent: {
    gap: 18,
    paddingHorizontal: horizontalPadding,
    paddingTop: 16,
    paddingBottom: 32,
  },
});
