import { useCallback, useEffect, useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import {
  Extrapolation,
  ReduceMotion,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { impactLight } from '@/haptics';
import { project, rubberband } from '@/motion';

export function useDetailSheetMotion(onClosed: () => void) {
  const { height } = useWindowDimensions();
  const translateY = useSharedValue(height);
  const dragContext = useSharedValue(0);

  useEffect(() => {
    translateY.set(
      withSpring(0, { duration: 420, dampingRatio: 0.88, reduceMotion: ReduceMotion.System }),
    );
  }, [translateY]);

  const requestClose = useCallback(() => {
    impactLight();
    translateY.set(
      withSpring(
        height,
        {
          duration: 320,
          dampingRatio: 1,
          overshootClamping: true,
          reduceMotion: ReduceMotion.System,
        },
        (finished) => {
          if (finished) {
            scheduleOnRN(onClosed);
          }
        },
      ),
    );
  }, [height, onClosed, translateY]);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY([-12, 12])
        .onStart(() => {
          dragContext.set(translateY.get());
        })
        .onUpdate((event) => {
          const next = dragContext.get() + event.translationY;

          translateY.set(next >= 0 ? next : rubberband(next, height));
        })
        .onEnd((event) => {
          const projected = translateY.get() + project(event.velocityY);

          if (projected > height * 0.25) {
            scheduleOnRN(requestClose);
            return;
          }

          translateY.set(
            withSpring(0, {
              duration: 360,
              dampingRatio: 0.8,
              velocity: event.velocityY,
              reduceMotion: ReduceMotion.System,
            }),
          );
        }),
    [dragContext, height, requestClose, translateY],
  );

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.get() }],
  }));
  const scrimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateY.get(), [0, height], [1, 0], Extrapolation.CLAMP),
  }));

  return { requestClose, pan, sheetStyle, scrimStyle };
}
