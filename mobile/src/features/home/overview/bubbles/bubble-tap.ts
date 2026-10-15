interface TouchPosition {
  absoluteX: number;
  absoluteY: number;
}

export function createBubbleTap(onPress: () => void, onRelease: () => void) {
  let start: TouchPosition | undefined;
  let travel = 0;
  let committed = false;

  const commit = () => {
    if (start === undefined || committed) {
      return;
    }

    committed = true;
    onPress();
  };

  const move = (touch: TouchPosition | undefined) => {
    if (start === undefined || touch === undefined) {
      return;
    }

    travel = Math.max(
      travel,
      Math.hypot(touch.absoluteX - start.absoluteX, touch.absoluteY - start.absoluteY),
    );
  };

  return {
    down(touch: TouchPosition | undefined) {
      start = touch;
      travel = 0;
      committed = false;
    },
    move,
    up(touch: TouchPosition | undefined) {
      move(touch);

      if (travel <= 32) {
        commit();
      }
    },
    cancel(touch: TouchPosition | undefined) {
      move(touch);

      if (travel <= 8) {
        commit();
      }
    },
    finalize(success: boolean) {
      if (success) {
        commit();
      } else if (!committed) {
        onRelease();
      }
    },
  };
}
