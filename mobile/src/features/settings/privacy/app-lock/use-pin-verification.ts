import { useCallback, useRef } from 'react';

import type { PinCheck } from '../privacy-context';
import { verifyPin, writePinAttempts } from '../privacy-storage';
import { afterFailedAttempt, noPinAttempts, remainingLockoutMs, type PinAttempts } from './pin';

export function usePinVerification() {
  const attempts = useRef<PinAttempts>(noPinAttempts);

  const restoreAttempts = useCallback((stored: PinAttempts) => {
    attempts.current = stored;
  }, []);

  const resetAttempts = useCallback(() => {
    attempts.current = noPinAttempts;
  }, []);

  const pinLockoutMs = useCallback(() => remainingLockoutMs(attempts.current, Date.now()), []);

  const checkPin = useCallback(async (pin: string): Promise<PinCheck> => {
    const waitMs = remainingLockoutMs(attempts.current, Date.now());

    if (waitMs > 0) {
      return { isCorrect: false, lockedForMs: waitMs };
    }

    if (await verifyPin(pin)) {
      attempts.current = noPinAttempts;
      await writePinAttempts(noPinAttempts).catch(() => undefined);

      return { isCorrect: true };
    }

    attempts.current = afterFailedAttempt(attempts.current, Date.now());
    await writePinAttempts(attempts.current).catch(() => undefined);

    return { isCorrect: false, lockedForMs: remainingLockoutMs(attempts.current, Date.now()) };
  }, []);

  return { restoreAttempts, resetAttempts, pinLockoutMs, checkPin };
}
