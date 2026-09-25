import { useSession } from '@clerk/expo';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { overviewColors } from '@/features/spending-overview/overview-theme';

interface EmailReverificationProps {
  onVerified: () => void;
}

type Stage = 'sending' | 'code' | 'checking' | 'unavailable';

export function EmailReverification({ onVerified }: EmailReverificationProps) {
  const { session } = useSession();
  const [stage, setStage] = useState<Stage>('sending');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const hasStarted = useRef(false);

  const sendCode = useCallback(async () => {
    if (session == null) {
      setStage('unavailable');
      return;
    }

    setError(null);
    setStage('sending');

    try {
      const verification = await session.startVerification({ level: 'first_factor' });

      if (verification.status === 'complete') {
        onVerified();
        return;
      }

      const emailFactor = verification.supportedFirstFactors?.find(
        (factor) => factor.strategy === 'email_code',
      );

      if (emailFactor === undefined || !('emailAddressId' in emailFactor)) {
        setStage('unavailable');
        return;
      }

      await session.prepareFirstFactorVerification({
        strategy: 'email_code',
        emailAddressId: emailFactor.emailAddressId,
      });
      setStage('code');
    } catch {
      setError('Nie udało się wysłać kodu. Spróbuj ponownie.');
      setStage('code');
    }
  }, [onVerified, session]);

  useEffect(() => {
    if (hasStarted.current) {
      return;
    }

    hasStarted.current = true;
    void sendCode();
  }, [sendCode]);

  const checkCode = useCallback(async () => {
    if (session == null || code.trim() === '') {
      return;
    }

    setError(null);
    setStage('checking');

    try {
      const verification = await session.attemptFirstFactorVerification({
        strategy: 'email_code',
        code: code.trim(),
      });

      if (verification.status === 'complete') {
        onVerified();
        return;
      }

      setError('Kod jest nieprawidłowy lub stracił ważność.');
    } catch {
      setError('Kod jest nieprawidłowy lub stracił ważność.');
    }

    setStage('code');
  }, [code, onVerified, session]);

  if (stage === 'unavailable') {
    return (
      <Text accessibilityLiveRegion="polite" maxFontSizeMultiplier={1.5} style={styles.error}>
        Nie możemy potwierdzić tożsamości kodem e-mail. Wyloguj się, zaloguj ponownie i spróbuj jeszcze raz.
      </Text>
    );
  }

  return (
    <View style={styles.form}>
      <Text maxFontSizeMultiplier={1.5} style={styles.hint}>
        {stage === 'sending'
          ? 'Wysyłamy kod na Twój adres e-mail…'
          : 'Wpisz kod, który wysłaliśmy na Twój adres e-mail.'}
      </Text>
      <TextInput
        accessibilityLabel="Kod z wiadomości e-mail"
        autoComplete="one-time-code"
        editable={stage === 'code'}
        inputMode="numeric"
        maxLength={8}
        onChangeText={setCode}
        onSubmitEditing={() => void checkCode()}
        placeholder="Kod"
        placeholderTextColor={overviewColors.textDisabled}
        style={styles.input}
        textContentType="oneTimeCode"
        value={code}
      />
      {error !== null ? (
        <Text accessibilityLiveRegion="polite" maxFontSizeMultiplier={1.5} style={styles.error}>
          {error}
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        disabled={stage !== 'code' || code.trim() === ''}
        onPress={() => void checkCode()}
        style={({ pressed }) => [
          styles.primary,
          stage !== 'code' || code.trim() === '' ? styles.disabled : null,
          pressed ? styles.pressed : null,
        ]}
      >
        {stage === 'checking' || stage === 'sending' ? (
          <ActivityIndicator color={overviewColors.background} />
        ) : (
          <Text maxFontSizeMultiplier={1.4} style={styles.primaryLabel}>
            Potwierdź
          </Text>
        )}
      </Pressable>
      <Pressable
        accessibilityRole="button"
        disabled={stage !== 'code'}
        onPress={() => void sendCode()}
        style={({ pressed }) => [styles.secondary, pressed ? styles.pressed : null]}
      >
        <Text maxFontSizeMultiplier={1.4} style={styles.secondaryLabel}>
          Wyślij kod ponownie
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 12,
  },
  hint: {
    fontSize: 15,
    lineHeight: 21,
    color: overviewColors.textSecondary,
  },
  input: {
    minHeight: 52,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: overviewColors.hairline,
    backgroundColor: overviewColors.surface,
    fontSize: 20,
    letterSpacing: 4,
    color: overviewColors.textPrimary,
  },
  error: {
    fontSize: 14,
    lineHeight: 20,
    color: overviewColors.negative,
  },
  primary: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: overviewColors.negative,
  },
  primaryLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: overviewColors.background,
  },
  secondary: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: overviewColors.textSecondary,
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.6,
  },
});
