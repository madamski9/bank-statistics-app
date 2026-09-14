import { useOAuth } from '@clerk/expo';
import { useCallback } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

import { useWarmUpBrowser } from './use-warm-up-browser';

WebBrowser.maybeCompleteAuthSession();

export function SignInScreen() {
  useWarmUpBrowser();
  const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' });

  const handleSignIn = useCallback(async () => {
    const { createdSessionId, setActive } = await startOAuthFlow();
    if (createdSessionId && setActive) {
      await setActive({ session: createdSessionId });
    }
  }, [startOAuthFlow]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>BankStats</Text>
      <Button title="Zaloguj się przez Google" onPress={handleSignIn} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
  },
});
