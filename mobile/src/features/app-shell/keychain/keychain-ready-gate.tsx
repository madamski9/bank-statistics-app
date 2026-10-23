import * as SecureStore from 'expo-secure-store';
import { useEffect, useState, type ReactNode } from 'react';
import { AppState, Platform } from 'react-native';

import { LoadingScreen } from '@/features/app-shell/brand/loading-screen';

import { waitForUnlockedKeychain, type KeychainProbe } from './keychain-readiness';

const probeKey = 'bankstats.keychain.probe.v1';
const probeOptions = { keychainAccessible: SecureStore.WHEN_UNLOCKED };
const retryDelayMs = 1000;

const secureStoreProbe: KeychainProbe = {
  read: () => SecureStore.getItemAsync(probeKey, probeOptions),
  write: (value) => SecureStore.setItemAsync(probeKey, value, probeOptions),
  isAppActive: () => AppState.currentState === 'active',
  wait: () => new Promise((resolve) => setTimeout(resolve, retryDelayMs)),
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

    void waitForUnlockedKeychain(secureStoreProbe).then(() => {
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
