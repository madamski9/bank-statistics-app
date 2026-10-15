import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useCopy } from '@/features/app-shell/localization/language';
import { overviewColors } from '@/features/app-shell/theme/overview-theme';

import { onboardingCopy } from '../onboarding-copy';
import { onboardingColors } from '../onboarding-motion';

interface OnboardingProgressProps {
  position: number;
  length: number;
}

export function OnboardingProgress({ position, length }: OnboardingProgressProps) {
  const copy = useCopy(onboardingCopy);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(position / length, {
      duration: 420,
      reduceMotion: ReduceMotion.System,
      easing: Easing.out(Easing.cubic),
    });
  }, [length, position, progress]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%` as `${number}%`,
  }));

  return (
    <View style={styles.progressContainer}>
      <View
        accessibilityLabel={copy.progress(position, length)}
        accessibilityRole="progressbar"
        accessibilityValue={{
          min: 0,
          max: length,
          now: position,
        }}
        style={styles.progressTrack}
      >
        <Animated.View style={[styles.progressFill, progressStyle]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  progressContainer: { width: '100%', maxWidth: 580, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 8 },
  progressTrack: {
    height: 4,
    backgroundColor: overviewColors.surfacePressed,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    backgroundColor: onboardingColors.accent,
    borderRadius: 4,
  },
});
