import * as Linking from 'expo-linking';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { isWidgetRevealUrl, widgetRevealWindowMs } from '@/features/widgets/widget-links';

import {
  authenticateWithBiometrics,
  availableBiometric,
  type BiometricKind,
  type BiometricOutcome,
} from './biometrics';
import { afterFailedAttempt, noPinAttempts, remainingLockoutMs, type PinAttempts } from './pin';
import {
  defaultPrivacySettings,
  shouldLockOnReturn,
  type PrivacySettings,
} from './privacy-settings';
import {
  hasStoredPin,
  readPinAttempts,
  readPrivacySettings,
  savePin,
  verifyPin,
  writePinAttempts,
  writePrivacySettings,
} from './privacy-storage';

export type LockReason = 'app' | 'widget';

export type ShieldMode = 'hidden' | 'cover' | 'lock';

export type PinCheck = { isCorrect: true } | { isCorrect: false; lockedForMs: number };

interface PrivacyContextValue {
  shieldMode: ShieldMode;
  lockScreen: ReactNode;
  topShieldId: string | null;
  registerShield: (id: string) => () => void;
  isLoaded: boolean;
  settings: PrivacySettings;
  hasPin: boolean;
  biometric: BiometricKind;
  lockReason: LockReason | null;
  isWidgetPreviewOpen: boolean;
  widgetRevealedUntilMs: number;
  updateSettings: (patch: Partial<PrivacySettings>) => Promise<void>;
  changePin: (pin: string) => Promise<void>;
  checkPin: (pin: string) => Promise<PinCheck>;
  pinLockoutMs: () => number;
  authenticate: (promptMessage: string) => Promise<BiometricOutcome>;
  unlock: () => void;
  cancelWidgetReveal: () => void;
  closeWidgetPreview: () => void;
}

const PrivacyContext = createContext<PrivacyContextValue | null>(null);

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
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [shieldIds, setShieldIds] = useState<string[]>([]);
  const [isWidgetPreviewOpen, setIsWidgetPreviewOpen] = useState(false);
  const [widgetRevealedUntilMs, setWidgetRevealedUntilMs] = useState(0);
  const attempts = useRef<PinAttempts>(noPinAttempts);
  const backgroundedAtMs = useRef<number | null>(null);
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

      attempts.current = storedAttempts;
      setSettings(storedSettings);
      setHasPin(storedPin);
      setBiometric(kind);
      setLockReason(storedSettings.isLockEnabled && storedPin ? 'app' : null);
      setIsLoaded(true);
    });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      setAppState(next);

      if (next === 'background') {
        setIsAuthenticating(false);
        backgroundedAtMs.current = Date.now();
        void availableBiometric().then(setBiometric);
        return;
      }

      if (next === 'active') {
        setIsAuthenticating(false);

        if (shouldLockOnReturn(settingsRef.current, backgroundedAtMs.current, Date.now())) {
          setIsWidgetPreviewOpen(false);
          setLockReason((current) => current ?? 'app');
        }

        backgroundedAtMs.current = null;
      }
    });

    return () => subscription.remove();
  }, []);

  const hasHandledInitialUrl = useRef(false);

  useEffect(() => {
    if (!isLoaded || !hasPin) {
      return;
    }

    const requestReveal = (url: string | null) => {
      if (isWidgetRevealUrl(url) && lockReasonRef.current !== 'widget') {
        setIsWidgetPreviewOpen(false);
        setLockReason('widget');
      }
    };

    if (!hasHandledInitialUrl.current) {
      hasHandledInitialUrl.current = true;
      void Linking.getInitialURL().then(requestReveal);
    }

    const subscription = Linking.addEventListener('url', ({ url }) => requestReveal(url));

    return () => subscription.remove();
  }, [hasPin, isLoaded]);

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
    attempts.current = noPinAttempts;
    setHasPin(true);
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

  const authenticate = useCallback(async (promptMessage: string) => {
    setIsAuthenticating(true);

    try {
      return await authenticateWithBiometrics(promptMessage);
    } finally {
      if (AppState.currentState === 'active') {
        setIsAuthenticating(false);
      }
    }
  }, []);

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

  const closeWidgetPreview = useCallback(() => setIsWidgetPreviewOpen(false), []);

  const registerShield = useCallback((id: string) => {
    setShieldIds((current) => [...current, id]);

    return () => setShieldIds((current) => current.filter((candidate) => candidate !== id));
  }, []);

  const isBackgrounded = (appState === 'inactive' || appState === 'background') && !isAuthenticating;
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
