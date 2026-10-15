import { useUser } from '@clerk/expo';
import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  interpolate,
  interpolateColor,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useCopy } from '@/features/app-shell/localization/language';
import { overviewColors } from '@/features/app-shell/theme/overview-theme';
import { accountInitial } from '@/features/home/profile/account-identity';

import { homeCopy } from '@/features/home/home-copy';

interface ProfileTabButtonProps {
  isSelected: boolean;
  onPress: () => void;
}

export function ProfileTabButton({ isSelected, onPress }: ProfileTabButtonProps) {
  const { user } = useUser();
  const copy = useCopy(homeCopy);
  const profileTabProgress = useSharedValue(0);

  useEffect(() => {
    profileTabProgress.set(
      withTiming(isSelected ? 1 : 0, { duration: 220, reduceMotion: ReduceMotion.System }),
    );
  }, [isSelected, profileTabProgress]);

  const profileTabStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(profileTabProgress.get(), [0, 1], [1, 1.12]) }],
    backgroundColor: interpolateColor(
      profileTabProgress.get(),
      [0, 1],
      [overviewColors.surfacePressed, overviewColors.textPrimary],
    ),
  }));

  const profileInitialStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      profileTabProgress.get(),
      [0, 1],
      [overviewColors.textPrimary, overviewColors.background],
    ),
  }));

  return (
    <Pressable
      accessibilityHint={copy.accountHint}
      accessibilityLabel={user?.firstName ? copy.accountOf(user.firstName) : copy.account}
      accessibilityRole="tab"
      accessibilityState={{ selected: isSelected }}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => (pressed ? styles.pressed : null)}
    >
      <Animated.View style={[styles.avatar, profileTabStyle]}>
        <Animated.Text maxFontSizeMultiplier={1.3} style={[styles.avatarInitial, profileInitialStyle]}>
          {accountInitial(user)}
        </Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.6,
  },
  avatar: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    backgroundColor: overviewColors.surfacePressed,
    overflow: 'hidden',
  },
  avatarInitial: {
    fontSize: 15,
    fontWeight: '600',
    color: overviewColors.textPrimary,
  },
});
