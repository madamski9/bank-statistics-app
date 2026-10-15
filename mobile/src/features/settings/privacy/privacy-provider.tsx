import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';

import { widgetRevealWindowMs } from '@/features/widgets/widget-links';

import { authenticateWithBiometrics, availableBiometric, type BiometricKind } from './app-lock/biometrics';
import { useLockOnReturn } from './app-lock/use-lock-on-return';
import { usePinVerification } from './app-lock/use-pin-verification';
import { useWidgetRevealLink } from './app-lock/use-widget-reveal-link';
import {
  PrivacyContext,
  type LockReason,
  type PrivacyContextValue,
  type ShieldMode,
} from './privacy-context';
import { defaultPrivacySettings, type PrivacySettings } from './privacy-settings';
import {
  hasStoredPin,
  readPinAttempts,
  readPrivacySettings,
  savePin,
  writePrivacySettings,
} from './privacy-storage';

interface PrivacyProviderProps {
  children: ReactNode;
  lockScreen: ReactNode;
}

export function PrivacyProvider({ children, lockScreen }: PrivacyProviderProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [settings, setSettings] = useState<PrivacySettings>(defaultPrivacySettings);
  const [hasPin, setHasPin] = useState(false);
  const [biometric, setBiometric] = useState<BiometricKind>('none');
  const [lockReason, setLockReason] = useState<LockReason | null>(null);
  const [shieldIds, setShieldIds] = useState<string[]>([]);
  const [isWidgetPreviewOpen, setIsWidgetPreviewOpen] = useState(false);
  const [widgetRevealedUntilMs, setWidgetRevealedUntilMs] = useState(0);
  const { restoreAttempts, resetAttempts, pinLockoutMs, checkPin } = usePinVerification();
  const isLockActive = settings.isLockEnabled && hasPin;
  const effectiveSettings = useMemo(
    () => ({ ...settings, isLockEnabled: isLockActive }),
    [isLockActive, settings],
  );
  const settingsRef = useRef(effectiveSettings);
  const lockReasonRef = useRef(lockReason);

  useEffect(() => {
    settingsRef.current = effectiveSettings;
  }, [effectiveSettings]);

  useEffect(() => {
    lockReasonRef.current = lockReason;
  }, [lockReason]);

  useEffect(() => {
    let isActive = true;

    void Promise.all([
      readPrivacySettings(),
      hasStoredPin(),
      availableBiometric(),
      readPinAttempts(),
    ]).then(([storedSettings, storedPin, kind, storedAttempts]) => {
      if (!isActive) {
        return;
      }

      restoreAttempts(storedAttempts);
      setSettings(storedSettings);
      setHasPin(storedPin);
      setBiometric(kind);
      setLockReason(storedSettings.isLockEnabled && storedPin ? 'app' : null);
      setIsLoaded(true);
    });

    return () => {
      isActive = false;
    };
  }, [restoreAttempts]);

  const closeWidgetPreview = useCallback(() => setIsWidgetPreviewOpen(false), []);

  const { isBackgrounded, setIsAuthenticating } = useLockOnReturn({
    settingsRef,
    onBiometricChange: setBiometric,
    onLock: setLockReason,
    onCloseWidgetPreview: closeWidgetPreview,
  });

  const requestWidgetReveal = useCallback(() => {
    setIsWidgetPreviewOpen(false);
    setLockReason('widget');
  }, []);

  useWidgetRevealLink({
    isEnabled: isLoaded && hasPin,
    lockReasonRef,
    onRevealRequested: requestWidgetReveal,
  });

  const updateSettings = useCallback(
    async (patch: Partial<PrivacySettings>) => {
      const next = { ...settings, ...patch };
      await writePrivacySettings(next);
      setSettings(next);
    },
    [settings],
  );

  const changePin = useCallback(async (pin: string) => {
    await savePin(pin);
    resetAttempts();
    setHasPin(true);
  }, [resetAttempts]);

  const authenticate = useCallback(async (promptMessage: string) => {
    setIsAuthenticating(true);

    try {
      return await authenticateWithBiometrics(promptMessage);
    } finally {
      if (AppState.currentState === 'active') {
        setIsAuthenticating(false);
      }
    }
  }, [setIsAuthenticating]);

  const unlock = useCallback(() => {
    if (lockReasonRef.current === 'widget') {
      setIsWidgetPreviewOpen(true);
      setWidgetRevealedUntilMs(Date.now() + widgetRevealWindowMs);
    }

    setLockReason(null);
  }, []);

  const cancelWidgetReveal = useCallback(() => {
    setLockReason(settingsRef.current.isLockEnabled ? 'app' : null);
  }, []);

  const registerShield = useCallback((id: string) => {
    setShieldIds((current) => [...current, id]);

    return () => setShieldIds((current) => current.filter((candidate) => candidate !== id));
  }, []);

  const shieldMode: ShieldMode =
    isLoaded && lockReason !== null ? 'lock' : isBackgrounded ? 'cover' : 'hidden';
  const topShieldId = shieldIds.at(-1) ?? null;

  const value = useMemo<PrivacyContextValue>(
    () => ({
      shieldMode,
      lockScreen,
      topShieldId,
      registerShield,
      isLoaded,
      settings: effectiveSettings,
      hasPin,
      biometric,
      lockReason,
      isWidgetPreviewOpen,
      widgetRevealedUntilMs,
      updateSettings,
      changePin,
      checkPin,
      pinLockoutMs,
      authenticate,
      unlock,
      cancelWidgetReveal,
      closeWidgetPreview,
    }),
    [
      shieldMode,
      lockScreen,
      topShieldId,
      registerShield,
      authenticate,
      biometric,
      cancelWidgetReveal,
      changePin,
      checkPin,
      closeWidgetPreview,
      effectiveSettings,
      hasPin,
      isLoaded,
      isWidgetPreviewOpen,
      lockReason,
      pinLockoutMs,
      unlock,
      updateSettings,
      widgetRevealedUntilMs,
    ],
  );

  return (
    <PrivacyContext.Provider value={value}>
      {children}
    </PrivacyContext.Provider>
  );
}

export function usePrivacy(): PrivacyContextValue {
  const value = useContext(PrivacyContext);

  if (value === null) {
    throw new Error('usePrivacy is used outside PrivacyProvider.');
  }

  return value;
}
