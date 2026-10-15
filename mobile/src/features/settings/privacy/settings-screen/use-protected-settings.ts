import { useCallback, useState } from 'react';

import { useCopy } from '@/features/app-shell/localization/language';

import { usePrivacy } from '../privacy-provider';
import { privacyCopy } from '../privacy-copy';
import type { PrivacySettings } from '../privacy-settings';

export type PendingStep =
  | { kind: 'confirm'; then: () => Promise<void> | void }
  | { kind: 'setPin'; then: () => Promise<void> | void };

export function useProtectedSettings() {
  const copy = useCopy(privacyCopy);
  const { hasPin, updateSettings, changePin } = usePrivacy();
  const [pending, setPending] = useState<PendingStep | null>(null);
  const [error, setError] = useState<string | null>(null);

  const save = useCallback(
    async (patch: Partial<PrivacySettings>) => {
      setError(null);

      try {
        await updateSettings(patch);
      } catch {
        setError(copy.saveFailed);
      }
    },
    [copy, updateSettings],
  );

  const withPin = useCallback(
    (action: () => Promise<void>) => {
      if (hasPin) {
        void action();
      } else {
        setPending({ kind: 'setPin', then: action });
      }
    },
    [hasPin],
  );

  const confirmed = useCallback((action: () => Promise<void> | void) => {
    setPending({ kind: 'confirm', then: action });
  }, []);

  const finishPending = useCallback(async () => {
    const step = pending;
    setPending(null);
    await step?.then();
  }, [pending]);

  const toggleProtected = (key: 'isLockEnabled' | 'isWidgetBlurred', isEnabled: boolean) => {
    if (isEnabled) {
      withPin(() => save({ [key]: true }));
    } else {
      confirmed(() => save({ [key]: false }));
    }
  };

  const setNewPin = () => setPending({ kind: 'setPin', then: () => undefined });

  const requestPinChange = () => {
    if (hasPin) {
      confirmed(setNewPin);
    } else {
      setNewPin();
    }
  };

  const completePin = async (pin: string) => {
    await changePin(pin);
    await finishPending();
  };

  return {
    pending,
    error,
    save,
    toggleProtected,
    requestPinChange,
    finishPending,
    completePin,
    cancelPending: () => setPending(null),
  };
}
