import { useCallback, useEffect, useMemo, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import {
  Extrapolation,
  Easing,
  ReduceMotion,
  cancelAnimation,
  interpolate,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { overviewMotion } from '@/features/app-shell/theme/overview-theme';
import { impactLight } from '@/haptics';
import { project, rubberband } from '@/motion';

import type { BubbleOrigin } from '../bubbles/glass-bubble';

export function useBubbleDetailMotion(origin: BubbleOrigin, onClosed: () => void) {
  const { width, height } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(0);
  const drag = useSharedValue(0);
  const dragContext = useSharedValue(0);
  const dismissal = useSharedValue(0);
  const closing = useSharedValue(false);
  const [contentReady, setContentReady] = useState(false);

  const coverScale = (2 * Math.hypot(width / 2, height / 2) * 1.1) / Math.max(origin.size, 1);
  const centerOffsetX = width / 2 - origin.x;
  const centerOffsetY = height / 2 - origin.y;

  useEffect(() => {
    progress.set(
      withSpring(1, { ...overviewMotion.transition, reduceMotion: ReduceMotion.System }),
    );
  }, [progress]);

  useAnimatedReaction(
    () => progress.get() > 0.25,
    (started, previous) => {
      if (started && previous !== true) {
        scheduleOnRN(setContentReady, true);
      }
    },
  );

  const requestClose = useCallback(() => {
    if (closing.get()) {
      return;
    }
    closing.set(true);
    impactLight();
    cancelAnimation(progress);
    cancelAnimation(drag);
    dismissal.set(
      withTiming(
        1,
        {
          duration: overviewMotion.exitDuration,
          easing: Easing.out(Easing.cubic),
          reduceMotion: ReduceMotion.System,
        },
        (finished) => {
          if (finished) {
            scheduleOnRN(onClosed);
          }
        },
      ),
    );
  }, [closing, dismissal, drag, onClosed, progress]);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY([-12, 12])
        .failOffsetX([-20, 20])
        .onStart(() => {
          dragContext.set(drag.get());
        })
        .onUpdate((event) => {
          if (dismissal.get() > 0) {
            return;
          }
          const next = dragContext.get() + event.translationY;

          drag.set(next >= 0 ? next : rubberband(next, height));
        })
        .onEnd((event) => {
          const projected = drag.get() + project(event.velocityY);

          if (projected > height * 0.18) {
            scheduleOnRN(requestClose);
            return;
          }

          drag.set(
            withSpring(0, {
              duration: 360,
              dampingRatio: 0.8,
              velocity: event.velocityY,
              reduceMotion: ReduceMotion.System,
            }),
          );
        })
        .onFinalize((_event, success) => {
          if (!success && dismissal.get() === 0) {
            drag.set(withSpring(0, { ...overviewMotion.dismiss, reduceMotion: ReduceMotion.System }));
          }
        }),
    [dismissal, drag, dragContext, height, requestClose],
  );

  const overlayStyle = useAnimatedStyle(() => ({
    opacity:
      (1 - dismissal.get()) *
      interpolate(drag.get(), [0, height * 0.6], [1, 0.35], Extrapolation.CLAMP),
    transform: reducedMotion
      ? []
      : [
          { translateY: drag.get() * 0.45 + dismissal.get() * 18 },
          { scale: 1 - dismissal.get() * 0.025 },
        ],
  }));

  const filmStyle = useAnimatedStyle(() => {
    const value = progress.get();

    return {
      transform: [
        { translateX: centerOffsetX * value },
        { translateY: centerOffsetY * value },
        { scaleX: interpolate(value, [0, 1], [origin.scaleX, coverScale]) },
        { scaleY: interpolate(value, [0, 1], [origin.scaleY, coverScale]) },
      ],
      opacity: interpolate(value, [0, 0.06], [0, 1], Extrapolation.CLAMP),
    };
  });

  const scrimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.get(),
      [0, 0.5],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));

  const skinStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.get(),
      [0, 0.55],
      [1, 0.1],
      Extrapolation.CLAMP,
    ),
  }));

  const contentStyle = useAnimatedStyle(() => {
    const value = progress.get();

    return {
      opacity: interpolate(value, [0.25, 0.85], [0, 1], Extrapolation.CLAMP),
      transform: [{ translateY: reducedMotion ? 0 : (1 - value) * 16 }],
    };
  });

  return {
    contentReady,
    requestClose,
    pan,
    overlayStyle,
    filmStyle,
    scrimStyle,
    skinStyle,
    contentStyle,
  };
}
