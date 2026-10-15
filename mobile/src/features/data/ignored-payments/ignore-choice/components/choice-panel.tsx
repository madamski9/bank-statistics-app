import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { overviewColors, overviewSpacing } from '@/features/app-shell/theme/overview-theme';

const enterSpring = { duration: 440, dampingRatio: 0.86, reduceMotion: ReduceMotion.System };
const exitTiming = {
  duration: 220,
  easing: Easing.in(Easing.cubic),
  reduceMotion: ReduceMotion.System,
};
const settleSpring = { duration: 320, dampingRatio: 0.9, reduceMotion: ReduceMotion.System };
const dismissDistance = 0.22;

interface ChoicePanelProps {
  visible: boolean;
  dismissLabel: string;
  onDismiss: () => void;
  children: ReactNode;
}

export function ChoicePanel({ visible, dismissLabel, onDismiss, children }: ChoicePanelProps) {
  const insets = useSafeAreaInsets();
  const [isRendered, setIsRendered] = useState(visible);
  const [panelHeight, setPanelHeight] = useState(420);
  const progress = useSharedValue(0);
  const drag = useSharedValue(0);

  if (visible && !isRendered) {
    setIsRendered(true);
  }

  useEffect(() => {
    if (!isRendered) {
      return;
    }

    if (visible) {
      drag.set(0);
      progress.set(withSpring(1, enterSpring));
      return;
    }

    progress.set(
      withTiming(0, exitTiming, (finished) => {
        if (finished) {
          scheduleOnRN(setIsRendered, false);
        }
      }),
    );
  }, [drag, isRendered, progress, visible]);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY(10)
        .failOffsetX([-20, 20])
        .onUpdate((event) => {
          drag.set(event.translationY >= 0 ? event.translationY : event.translationY / 6);
        })
        .onEnd((event) => {
          const projected = drag.get() + event.velocityY * 0.12;

          if (projected > panelHeight * dismissDistance) {
            scheduleOnRN(onDismiss);
            return;
          }

          drag.set(withSpring(0, { ...settleSpring, velocity: event.velocityY }));
        }),
    [drag, onDismiss, panelHeight],
  );

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: progress.get() * 0.64,
  }));

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - progress.get()) * (panelHeight + insets.bottom + 24) + drag.get() }],
  }));

  if (!isRendered) {
    return null;
  }

  return (
    <GestureHandlerRootView pointerEvents={visible ? 'auto' : 'none'} style={StyleSheet.absoluteFill}>
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable
          accessibilityLabel={dismissLabel}
          accessibilityRole="button"
          onPress={onDismiss}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <GestureDetector gesture={pan}>
        <Animated.View
          accessibilityViewIsModal
          onAccessibilityEscape={onDismiss}
          onLayout={(event) => setPanelHeight(event.nativeEvent.layout.height)}
          style={[styles.panel, { paddingBottom: insets.bottom + overviewSpacing.block }, panelStyle]}
        >
          <View style={styles.grabber} />
          {children}
        </Animated.View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: overviewColors.scrim,
  },
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: overviewSpacing.block,
    paddingHorizontal: overviewSpacing.gutter,
    paddingTop: 10,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: 0,
    borderColor: overviewColors.hairline,
    backgroundColor: overviewColors.surface,
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 5,
    marginBottom: 4,
    borderRadius: 3,
    backgroundColor: overviewColors.textDisabled,
  },
});
