import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCopy } from '@/features/app-shell/localization/language';
import { ScalePressable } from '@/features/app-shell/motion/scale-pressable';
import { overviewColors, overviewSpacing } from '@/features/app-shell/theme/overview-theme';

import { onboardingCopy } from '../onboarding-copy';
import { onboardingColors } from '../onboarding-motion';

interface OnboardingTopBarProps {
  stepLabel: string;
  canGoBack: boolean;
  canSkip: boolean;
  isBusy: boolean;
  onBack: () => void;
  onSkip: () => void;
}

export function OnboardingTopBar({ stepLabel, canGoBack, canSkip, isBusy, onBack, onSkip }: OnboardingTopBarProps) {
  const copy = useCopy(onboardingCopy);
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.topBar, { paddingTop: insets.top + 12, paddingLeft: Math.max(insets.left, 20), paddingRight: Math.max(insets.right, 20) }]}>
      {canGoBack ? (
        <ScalePressable
          accessibilityLabel={copy.back}
          accessibilityRole="button"
          disabled={isBusy}
          onPress={onBack}
          style={styles.topAction}
        >
          <SymbolView
            name={{
              ios: 'chevron.left',
              android: 'arrow_back',
              web: 'arrow_back',
            }}
            size={18}
            tintColor={overviewColors.textPrimary}
          />
        </ScalePressable>
      ) : (
        <View style={styles.topAction} />
      )}
      <Text maxFontSizeMultiplier={1.3} style={styles.stepCount}>
        {stepLabel}
      </Text>
      {canSkip ? (
        <ScalePressable
          accessibilityRole="button"
          onPress={onSkip}
          style={styles.skipAction}
        >
          <Text style={styles.skipLabel}>{copy.skipIntro}</Text>
        </ScalePressable>
      ) : (
        <View style={styles.skipAction} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    minHeight: 60,
    width: '100%',
    maxWidth: 580,
    alignSelf: 'center',
    paddingHorizontal: overviewSpacing.gutter,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topAction: { width: 64, minHeight: 48, justifyContent: 'center' },
  skipAction: {
    minWidth: 64,
    minHeight: 48,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  skipLabel: {
    color: overviewColors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  stepCount: {
    color: onboardingColors.accentText,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: onboardingColors.accentMuted,
    fontSize: 13,
    fontWeight: '600',
  },
});
