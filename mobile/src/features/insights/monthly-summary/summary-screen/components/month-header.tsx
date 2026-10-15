import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInLeft, FadeInRight, ReduceMotion } from 'react-native-reanimated';

import { useCopy } from '@/features/app-shell/localization/language';
import { ScalePressable } from '@/features/app-shell/motion/scale-pressable';
import { overviewColors, overviewSpacing } from '@/features/app-shell/theme/overview-theme';

import { monthlySummaryCopy } from '../../monthly-summary-copy';
import { summaryStyles } from './summary-styles';

export type MonthTravel = 'older' | 'newer';

interface MonthHeaderProps {
  title: string;
  monthKey: string;
  isComplete: boolean;
  travel: MonthTravel | null;
  canShowOlder: boolean;
  canShowNewer: boolean;
  onShowOlder: () => void;
  onShowNewer: () => void;
}

export function MonthHeader({
  title,
  monthKey,
  isComplete,
  travel,
  canShowOlder,
  canShowNewer,
  onShowOlder,
  onShowNewer,
}: MonthHeaderProps) {
  const copy = useCopy(monthlySummaryCopy);

  return (
    <View style={styles.monthRow}>
      <ScalePressable
        accessibilityLabel={copy.previousMonth}
        accessibilityRole="button"
        containerStyle={!canShowOlder ? styles.hidden : null}
        disabled={!canShowOlder}
        hitSlop={8}
        onPress={onShowOlder}
        pressedScale={0.88}
        style={styles.monthArrow}
      >
        <SymbolView
          name={{ ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }}
          size={17}
          tintColor={overviewColors.textPrimary}
        />
      </ScalePressable>
      <Animated.View entering={travel === null ? undefined : monthEntering(travel)} key={monthKey} style={styles.monthTitle}>
        <Text accessibilityRole="header" maxFontSizeMultiplier={1.3} style={styles.monthName}>
          {title}
        </Text>
        {!isComplete ? (
          <Text maxFontSizeMultiplier={1.4} style={summaryStyles.caption}>
            {copy.inProgress}
          </Text>
        ) : null}
      </Animated.View>
      <ScalePressable
        accessibilityLabel={copy.nextMonth}
        accessibilityRole="button"
        containerStyle={!canShowNewer ? styles.hidden : null}
        disabled={!canShowNewer}
        hitSlop={8}
        onPress={onShowNewer}
        pressedScale={0.88}
        style={styles.monthArrow}
      >
        <SymbolView
          name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
          size={17}
          tintColor={overviewColors.textPrimary}
        />
      </ScalePressable>
    </View>
  );
}

function monthEntering(travel: MonthTravel) {
  const transition = travel === 'older' ? FadeInLeft : FadeInRight;

  return transition.springify().duration(250).dampingRatio(0.9).reduceMotion(ReduceMotion.System);
}

const styles = StyleSheet.create({
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: overviewSpacing.row,
  },
  monthArrow: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: overviewColors.surfacePressed,
  },
  hidden: {
    opacity: 0,
  },
  monthTitle: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  monthName: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: overviewColors.textPrimary,
  },
});
