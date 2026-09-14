import { useSSO } from '@clerk/expo';
import { useCallback } from 'react';
import { Button, Platform, StyleSheet, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

import { EmailCodeSignIn } from './email-code-sign-in';
import { useWarmUpBrowser } from './use-warm-up-browser';

WebBrowser.maybeCompleteAuthSession();

export function SignInScreen() {
  useWarmUpBrowser();
  const { startSSOFlow } = useSSO();

  const signInWith = useCallback(
    async (strategy: 'oauth_google' | 'oauth_apple') => {
      const { createdSessionId, setActive } = await startSSOFlow({ strategy });
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
      }
    },
    [startSSOFlow],
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>BankStats</Text>
      <Button title="Zaloguj się przez Google" onPress={() => signInWith('oauth_google')} />
      {Platform.OS === 'ios' ? (
        <Button title="Zaloguj się przez Apple" onPress={() => signInWith('oauth_apple')} />
      ) : null}
      <EmailCodeSignIn />
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
