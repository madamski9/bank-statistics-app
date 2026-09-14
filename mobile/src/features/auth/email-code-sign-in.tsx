import { useSignIn, useSignUp } from '@clerk/expo';
import { useCallback, useState } from 'react';
import { Button, StyleSheet, Text, TextInput, View } from 'react-native';

type Step = 'email' | 'code';
type Mode = 'sign-in' | 'sign-up';

export function EmailCodeSignIn() {
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const [step, setStep] = useState<Step>('email');
  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const requestCode = useCallback(async () => {
    setError(null);
    const attempt = await signIn.create({ identifier: email, signUpIfMissing: true });
    if (attempt.error) {
      setError('Nie udało się wysłać kodu');
      return;
    }

    if (signIn.isTransferable) {
      const created = await signUp.create({ emailAddress: email, transfer: true });
      if (created.error) {
        setError('Nie udało się wysłać kodu');
        return;
      }
      await signUp.verifications.sendEmailCode();
      setMode('sign-up');
      setStep('code');
      return;
    }

    await signIn.emailCode.sendCode();
    setMode('sign-in');
    setStep('code');
  }, [email, signIn, signUp]);

  const verifyCode = useCallback(async () => {
    setError(null);
    if (mode === 'sign-in') {
      const result = await signIn.emailCode.verifyCode({ code });
      if (result.error) {
        setError('Nieprawidłowy kod');
        return;
      }
      if (signIn.status === 'complete') {
        await signIn.finalize();
      }
      return;
    }

    const result = await signUp.verifications.verifyEmailCode({ code });
    if (result.error) {
      setError('Nieprawidłowy kod');
      return;
    }
    if (signUp.status === 'complete') {
      await signUp.finalize();
    }
  }, [code, mode, signIn, signUp]);

  if (step === 'email') {
    return (
      <View style={styles.step}>
        <TextInput
          style={styles.input}
          placeholder="Adres e-mail"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <Button title="Wyślij kod" onPress={requestCode} />
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    );
  }

  return (
    <View style={styles.step}>
      <TextInput
        style={styles.input}
        placeholder="Kod z e-maila"
        keyboardType="number-pad"
        value={code}
        onChangeText={setCode}
      />
      <Button title="Potwierdź" onPress={verifyCode} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  step: {
    width: '100%',
    gap: 12,
    alignItems: 'stretch',
  },
  input: {
    borderWidth: 1,
    borderColor: '#cccccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  error: {
    color: '#cc3333',
    fontSize: 13,
  },
});
