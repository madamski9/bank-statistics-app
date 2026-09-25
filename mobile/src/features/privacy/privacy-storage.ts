import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

import {
  createStoredPin,
  matchesStoredPin,
  noPinAttempts,
  parsePinAttempts,
  parseStoredPin,
  type PinAttempts,
} from './pin';
import { parsePrivacySettings, type PrivacySettings } from './privacy-settings';

const keys = {
  settings: 'bankstats.privacy.settings.v1',
  pin: 'bankstats.privacy.pin.v1',
  attempts: 'bankstats.privacy.pin-attempts.v1',
} as const;

const deviceOnly: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

function sha256(value: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, value);
}

function newSalt(): string {
  return Array.from(Crypto.getRandomBytes(16), (byte) => byte.toString(16).padStart(2, '0')).join(
    '',
  );
}

export async function readPrivacySettings(): Promise<PrivacySettings> {
  try {
    return parsePrivacySettings(await SecureStore.getItemAsync(keys.settings, deviceOnly));
  } catch {
    return parsePrivacySettings(null);
  }
}

export async function writePrivacySettings(settings: PrivacySettings): Promise<void> {
  await SecureStore.setItemAsync(keys.settings, JSON.stringify(settings), deviceOnly);
}

export async function hasStoredPin(): Promise<boolean> {
  try {
    return parseStoredPin(await SecureStore.getItemAsync(keys.pin, deviceOnly)) !== null;
  } catch {
    return false;
  }
}

export async function savePin(pin: string): Promise<void> {
  const stored = await createStoredPin(pin, newSalt(), sha256);
  await SecureStore.setItemAsync(keys.pin, JSON.stringify(stored), deviceOnly);
  await writePinAttempts(noPinAttempts);
}

export async function verifyPin(pin: string): Promise<boolean> {
  const stored = parseStoredPin(await SecureStore.getItemAsync(keys.pin, deviceOnly));

  return stored !== null && matchesStoredPin(pin, stored, sha256);
}

export async function readPinAttempts(): Promise<PinAttempts> {
  try {
    return parsePinAttempts(await SecureStore.getItemAsync(keys.attempts, deviceOnly));
  } catch {
    return noPinAttempts;
  }
}

export async function writePinAttempts(attempts: PinAttempts): Promise<void> {
  await SecureStore.setItemAsync(keys.attempts, JSON.stringify(attempts), deviceOnly);
}

export async function clearPrivacyStorage(): Promise<void> {
  await Promise.all(Object.values(keys).map((key) => SecureStore.deleteItemAsync(key, deviceOnly)));
}
