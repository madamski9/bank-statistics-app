import { useEffect, useRef, useState, type RefObject } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import type { LockReason } from '../privacy-context';
import { shouldLockOnReturn, type PrivacySettings } from '../privacy-settings';
import { availableBiometric, type BiometricKind } from './biometrics';

interface LockOnReturnOptions {
  settingsRef: RefObject<PrivacySettings>;
  onBiometricChange: (kind: BiometricKind) => void;
  onLock: (reason: (current: LockReason | null) => LockReason) => void;
  onCloseWidgetPreview: () => void;
}

export function useLockOnReturn({ settingsRef, onBiometricChange, onLock, onCloseWidgetPreview }: LockOnReturnOptions) {
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const backgroundedAtMs = useRef<number | null>(null);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      setAppState(next);

      if (next === 'background') {
        setIsAuthenticating(false);
        backgroundedAtMs.current = Date.now();
        void availableBiometric().then(onBiometricChange);
        return;
      }

      if (next === 'active') {
        setIsAuthenticating(false);

        if (shouldLockOnReturn(settingsRef.current, backgroundedAtMs.current, Date.now())) {
          onCloseWidgetPreview();
          onLock((current) => current ?? 'app');
        }

        backgroundedAtMs.current = null;
      }
    });

    return () => subscription.remove();
  }, [onBiometricChange, onCloseWidgetPreview, onLock, settingsRef]);

  const isBackgrounded = (appState === 'inactive' || appState === 'background') && !isAuthenticating;

  return { isBackgrounded, setIsAuthenticating };
}
