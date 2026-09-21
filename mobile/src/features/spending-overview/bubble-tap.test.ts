import { describe, expect, mock, test } from 'bun:test';

import { createBubbleTap } from './bubble-tap';

const position = (x: number, y = 100) => ({ absoluteX: x, absoluteY: y });

function setup() {
  const press = mock(() => {});
  const release = mock(() => {});
  const tap = createBubbleTap(press, release);

  tap.down(position(100));

  return { tap, press, release };
}

describe('bubble tap', () => {
  test('opens once for a quick tap followed by successful recognition', () => {
    const { tap, press, release } = setup();

    tap.up(position(100));
    tap.finalize(true);

    expect(press).toHaveBeenCalledTimes(1);
    expect(release).not.toHaveBeenCalled();
  });

  test('opens when touch-up arrives after failed recognition', () => {
    const { tap, press } = setup();

    tap.finalize(false);
    tap.up(position(104));

    expect(press).toHaveBeenCalledTimes(1);
  });

  test('keeps a committed rebound when failure arrives after touch-up', () => {
    const { tap, press, release } = setup();

    tap.up(position(104));
    tap.finalize(false);

    expect(press).toHaveBeenCalledTimes(1);
    expect(release).not.toHaveBeenCalled();
  });

  for (const cancellationFirst of [true, false]) {
    test(`recovers a stationary cancellation with cancellationFirst=${cancellationFirst}`, () => {
      const { tap, press } = setup();

      if (cancellationFirst) {
        tap.cancel(position(102));
        tap.finalize(false);
      } else {
        tap.finalize(false);
        tap.cancel(position(102));
      }

      expect(press).toHaveBeenCalledTimes(1);
    });
  }

  test('does not open for a swipe that returns to its starting point', () => {
    const { tap, press, release } = setup();

    tap.move(position(150));
    tap.up(position(100));
    tap.finalize(false);
    tap.cancel(position(100));

    expect(press).not.toHaveBeenCalled();
    expect(release).toHaveBeenCalledTimes(1);
  });

  test('checks the final touch position even without a move event', () => {
    const { tap, press } = setup();

    tap.up(position(150));
    tap.finalize(false);
    tap.cancel(position(150));

    expect(press).not.toHaveBeenCalled();
  });

  test('allows another tap after the preceding interaction finishes', () => {
    const { tap, press } = setup();

    tap.up(position(100));
    tap.finalize(true);
    tap.down(position(200));
    tap.up(position(201));
    tap.finalize(true);

    expect(press).toHaveBeenCalledTimes(2);
  });

  test('does not open without an initial touch', () => {
    const press = mock(() => {});
    const tap = createBubbleTap(press, () => {});

    tap.down(undefined);
    tap.up(undefined);
    tap.cancel(undefined);
    tap.finalize(true);

    expect(press).not.toHaveBeenCalled();
  });
});
