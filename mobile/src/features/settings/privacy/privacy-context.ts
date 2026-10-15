import { createContext, type ReactNode } from 'react';

import type { BiometricKind, BiometricOutcome } from './app-lock/biometrics';
import type { PrivacySettings } from './privacy-settings';

export type LockReason = 'app' | 'widget';

export type ShieldMode = 'hidden' | 'cover' | 'lock';

export type PinCheck = { isCorrect: true } | { isCorrect: false; lockedForMs: number };

export interface PrivacyContextValue {
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

export const PrivacyContext = createContext<PrivacyContextValue | null>(null);
