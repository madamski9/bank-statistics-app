import * as Haptics from 'expo-haptics';

/**
 * Haptics are always a bonus signal, never the only feedback, so no call is allowed to fail
 * loudly: a device without a Taptic Engine, a user who turned vibration off, or a dev build
 * made before expo-haptics was linked must not turn a tap into an unhandled rejection.
 */
function attempt(run: () => Promise<void>): void {
  try {
    void run().catch(() => undefined);
  } catch {
    // Ignored on purpose - see above.
  }
}

/** Something snapped home or a selection committed. */
export function impactLight(): void {
  attempt(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

/** A value ticked past a step, such as a range tab. */
export function selectionChanged(): void {
  attempt(() => Haptics.selectionAsync());
}
