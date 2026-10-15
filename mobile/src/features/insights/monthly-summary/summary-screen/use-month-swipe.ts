import { useLayoutEffect } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { selectionChanged } from '@/haptics';

const swipeDistance = 72;
const swipeVelocity = 600;
const edgeResistance = 0.2;
const settleMinMs = 140;
const settleMaxMs = 280;
const settleEasing = Easing.out(Easing.cubic);

interface MonthSwipeOptions {
  selectedKey: string;
  travelDistance: number;
  canShowOlder: boolean;
  canShowNewer: boolean;
  onCommit: (direction: number) => boolean;
}

export function useMonthSwipe({ selectedKey, travelDistance, canShowOlder, canShowNewer, onCommit }: MonthSwipeOptions) {
  const drag = useSharedValue(0);
  const isSettling = useSharedValue(false);

  useLayoutEffect(() => {
    drag.set(0);
    isSettling.set(false);
  }, [drag, isSettling, selectedKey]);

  const commitMove = (direction: number) => {
    if (!onCommit(direction)) {
      isSettling.set(false);
    }
  };

  const settleTo = (direction: number, velocity: number) => {
    'worklet';
    const remaining = Math.abs(direction * travelDistance - drag.get());
    const speed = Math.abs(velocity);
    const duration = speed > 0
      ? Math.min(Math.max((remaining / speed) * 1000 * 1.6, settleMinMs), settleMaxMs)
      : settleMaxMs;

    isSettling.set(true);
    drag.set(
      withTiming(
        direction * travelDistance,
        { duration, easing: settleEasing, reduceMotion: ReduceMotion.System },
        (finished) => {
          if (finished) {
            scheduleOnRN(commitMove, direction);
          } else {
            isSettling.set(false);
          }
        },
      ),
    );
  };

  const move = (direction: number) => {
    const isAllowed = direction > 0 ? canShowOlder : canShowNewer;

    if (!isAllowed || isSettling.get()) {
      return;
    }

    selectionChanged();
    settleTo(direction, 0);
  };

  const swipe = Gesture.Pan()
    .activeOffsetX([-16, 16])
    .failOffsetY([-12, 12])
    .onUpdate((event) => {
      if (isSettling.get()) {
        return;
      }

      const isBlocked = event.translationX > 0 ? !canShowOlder : !canShowNewer;

      drag.set(isBlocked ? event.translationX * edgeResistance : event.translationX);
    })
    .onEnd((event) => {
      if (isSettling.get()) {
        return;
      }

      const direction = event.translationX > 0 ? 1 : -1;
      const isAllowed = direction > 0 ? canShowOlder : canShowNewer;
      const isFlung = Math.abs(event.velocityX) > swipeVelocity && Math.sign(event.velocityX) === direction;

      if (isAllowed && (Math.abs(event.translationX) > swipeDistance || isFlung)) {
        scheduleOnRN(selectionChanged);
        settleTo(direction, event.velocityX);
        return;
      }

      drag.set(withSpring(0, { duration: 400, dampingRatio: 0.8, velocity: event.velocityX }));
    });

  const dragStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: drag.get() }],
  }));

  return { swipe, dragStyle, move };
}
