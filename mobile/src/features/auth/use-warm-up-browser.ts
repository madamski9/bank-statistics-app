import { useEffect } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

export function useWarmUpBrowser() {
  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }

    void WebBrowser.warmUpAsync().catch(() => undefined);
    return () => {
      void WebBrowser.coolDownAsync().catch(() => undefined);
    };
  }, []);
}
