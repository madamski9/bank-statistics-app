import * as SecureStore from 'expo-secure-store';
import { useEffect, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { LoadingScreen } from '@/features/app-shell/brand/loading-screen';

import { waitForUnlockedKeychain, type KeychainProbe } from './keychain-readiness';
import { keychainRetry, markKeychainUnavailable } from './keychain-retry';

const probeKey = 'bankstats.keychain.probe.v1';
const probeOptions = { keychainAccessible: SecureStore.WHEN_UNLOCKED };

const secureStoreProbe: KeychainProbe = {
  read: () => SecureStore.getItemAsync(probeKey, probeOptions),
  write: (value) => SecureStore.setItemAsync(probeKey, value, probeOptions),
  ...keychainRetry,
  canWaitForUnlock: () => true,
};

interface KeychainReadyGateProps {
  children: ReactNode;
}

export function KeychainReadyGate({ children }: KeychainReadyGateProps) {
  const [isReady, setIsReady] = useState(Platform.OS !== 'ios');

  useEffect(() => {
    if (isReady) {
      return;
    }

    let isActive = true;

    void waitForUnlockedKeychain(secureStoreProbe).then((isUnlocked) => {
      if (!isUnlocked) {
        markKeychainUnavailable();
      }

      if (isActive) {
        setIsReady(true);
      }
    });

    return () => {
      isActive = false;
    };
  }, [isReady]);

  return isReady ? children : <LoadingScreen />;
}
