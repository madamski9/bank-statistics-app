import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

import { currentCopy } from '@/features/localization/language';

import { privacyCopy } from './privacy-copy';

export type BiometricKind = 'faceId' | 'touchId' | 'none';

export type BiometricOutcome = 'success' | 'usePin' | 'cancelled' | 'unavailable';

export const biometricLabels: Record<Exclude<BiometricKind, 'none'>, string> = {
  faceId: 'Face ID',
  touchId: 'Touch ID',
};

export async function availableBiometric(): Promise<BiometricKind> {
  if (Platform.OS !== 'ios') {
    return 'none';
  }

  try {
    const [hasHardware, isEnrolled, types] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
    ]);

    if (!hasHardware || !isEnrolled) {
      return 'none';
    }

    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return 'faceId';
    }

    return types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT) ? 'touchId' : 'none';
  } catch {
    return 'none';
  }
}

export async function authenticateWithBiometrics(promptMessage: string): Promise<BiometricOutcome> {
  const copy = currentCopy(privacyCopy);

  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: copy.cancel,
      fallbackLabel: copy.usePin,
      disableDeviceFallback: true,
    });

    if (result.success) {
      return 'success';
    }

    if (result.error === 'user_fallback' || result.error === 'lockout') {
      return 'usePin';
    }

    if (
      result.error === 'not_enrolled' ||
      result.error === 'not_available' ||
      result.error === 'passcode_not_set'
    ) {
      return 'unavailable';
    }

    return 'cancelled';
  } catch {
    return 'unavailable';
  }
}
