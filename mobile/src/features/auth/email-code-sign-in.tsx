import { useSignIn, useSignUp } from '@clerk/expo';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useCopy } from '@/features/localization/language';

import { authCopy } from './auth-copy';

type Step = 'email' | 'code';
type Mode = 'sign-in' | 'sign-up';

interface EmailCodeSignInProps {
  onStepChange?: (step: Step) => void;
}

const colors = {
  surface: '#0D0D0F',
  controlBorder: '#5F5F63',
  textPrimary: '#FFFFFF',
  onAccent: '#000000',
  textSecondary: '#8E8E93',
  accent: '#8F7BFF',
  danger: '#FF5C7A',
};

export function EmailCodeSignIn({ onStepChange }: EmailCodeSignInProps) {
  const copy = useCopy(authCopy);
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const [step, setStep] = useState<Step>('email');
  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const requestCode = useCallback(async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail.includes('@')) {
      setError(copy.invalidEmail);
      return;
    }

    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    try {
      const attempt = await signIn.create({
        identifier: normalizedEmail,
        signUpIfMissing: true,
      });

      if (attempt.error) {
        setError(copy.sendFailed);
        return;
      }

      if (signIn.isTransferable) {
        const created = await signUp.create({ emailAddress: normalizedEmail, transfer: true });

        if (created.error) {
          setError(copy.createFailed);
          return;
        }

        const sent = await signUp.verifications.sendEmailCode();

        if (sent.error) {
          setError(copy.sendFailed);
          return;
        }

        setMode('sign-up');
      } else {
        const sent = await signIn.emailCode.sendCode();

        if (sent.error) {
          setError(copy.sendFailed);
          return;
        }

        setMode('sign-in');
      }

      setEmail(normalizedEmail);
      setStep('code');
      onStepChange?.('code');
    } catch {
      setError(copy.connectionFailed);
    } finally {
      setIsSubmitting(false);
    }
  }, [copy, email, onStepChange, signIn, signUp]);

  const verifyCode = useCallback(async () => {
    if (code.trim().length === 0) {
      setError(copy.enterCode);
      return;
    }

    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    try {
      if (mode === 'sign-in') {
        const result = await signIn.emailCode.verifyCode({ code: code.trim() });

        if (result.error) {
          setError(copy.invalidCode);
          return;
        }

        if (signIn.status === 'complete') {
          await signIn.finalize();
        }

        return;
      }

      const result = await signUp.verifications.verifyEmailCode({ code: code.trim() });

      if (result.error) {
        setError(copy.invalidCode);
        return;
      }

      if (signUp.status === 'complete') {
        await signUp.finalize();
      }
    } catch {
      setError(copy.verifyFailed);
    } finally {
      setIsSubmitting(false);
    }
  }, [code, copy, mode, signIn, signUp]);

  const resendCode = useCallback(async () => {
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    try {
      const result =
        mode === 'sign-in'
          ? await signIn.emailCode.sendCode()
          : await signUp.verifications.sendEmailCode();

      if (result.error) {
        setError(copy.resendFailed);
        return;
      }

      setMessage(copy.resent);
    } catch {
      setError(copy.resendFailed);
    } finally {
      setIsSubmitting(false);
    }
  }, [copy, mode, signIn, signUp]);

  const changeEmail = useCallback(() => {
    signIn.reset();
    signUp.reset();
    setCode('');
    setError(null);
    setMessage(null);
    setStep('email');
    onStepChange?.('email');
  }, [onStepChange, signIn, signUp]);

  const isDisabled =
    isSubmitting || (step === 'email' ? email.trim().length === 0 : code.length === 0);

  return (
    <View style={styles.form}>
      {step === 'email' ? (
        <View style={styles.fieldGroup}>
          <Text maxFontSizeMultiplier={1.4} style={styles.label}>
            {copy.emailAddress}
          </Text>
          <TextInput
            accessibilityLabel={copy.emailAddress}
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            editable={!isSubmitting}
            keyboardType="email-address"
            onChangeText={setEmail}
            onSubmitEditing={requestCode}
            placeholder="ty@example.com"
            placeholderTextColor={colors.textSecondary}
            returnKeyType="send"
            style={styles.input}
            textContentType="emailAddress"
            value={email}
          />
        </View>
      ) : (
        <View style={styles.fieldGroup}>
          <View style={styles.codeHeading}>
            <View style={styles.codeCopy}>
              <Text maxFontSizeMultiplier={1.4} style={styles.label}>
                {copy.emailCode}
              </Text>
              <Text maxFontSizeMultiplier={1.5} style={styles.helper}>
                {copy.sentTo(email)}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              disabled={isSubmitting}
              hitSlop={8}
              onPress={changeEmail}
              style={({ pressed }) => [styles.textButton, pressed ? styles.pressed : null]}
            >
              <Text maxFontSizeMultiplier={1.4} style={styles.textButtonLabel}>
                {copy.change}
              </Text>
            </Pressable>
          </View>
          <TextInput
            accessibilityLabel={copy.emailCode}
            autoComplete="one-time-code"
            editable={!isSubmitting}
            keyboardType="number-pad"
            maxLength={8}
            onChangeText={setCode}
            onSubmitEditing={verifyCode}
            placeholder="000000"
            placeholderTextColor={colors.textSecondary}
            returnKeyType="done"
            selectTextOnFocus
            style={[styles.input, styles.codeInput]}
            textContentType="oneTimeCode"
            value={code}
          />
        </View>
      )}

      {error !== null ? (
        <Text accessibilityLiveRegion="polite" maxFontSizeMultiplier={1.5} style={styles.error}>
          {error}
        </Text>
      ) : null}

      {message !== null ? (
        <Text accessibilityLiveRegion="polite" maxFontSizeMultiplier={1.5} style={styles.message}>
          {message}
        </Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        disabled={isDisabled}
        onPress={step === 'email' ? requestCode : verifyCode}
        style={({ pressed }) => [
          styles.primaryButton,
          isDisabled ? styles.disabled : null,
          pressed ? styles.primaryButtonPressed : null,
        ]}
      >
        {isSubmitting ? (
          <ActivityIndicator color={colors.onAccent} />
        ) : (
          <Text maxFontSizeMultiplier={1.4} style={styles.primaryButtonLabel}>
            {step === 'email' ? copy.sendCode : copy.signIn}
          </Text>
        )}
      </Pressable>

      {step === 'code' ? (
        <Pressable
          accessibilityRole="button"
          disabled={isSubmitting}
          onPress={resendCode}
          style={({ pressed }) => [styles.resendButton, pressed ? styles.pressed : null]}
        >
          <Text maxFontSizeMultiplier={1.4} style={styles.resendLabel}>
            {copy.resendCode}
          </Text>
        </Pressable>
      ) : null}

      <View nativeID="clerk-captcha" />
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 12,
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  input: {
    minHeight: 50,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.controlBorder,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  codeInput: {
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 7,
  },
  codeHeading: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  codeCopy: {
    flex: 1,
    gap: 3,
  },
  helper: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  textButton: {
    minHeight: 48,
    justifyContent: 'center',
  },
  textButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.accent,
  },
  primaryButton: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: colors.accent,
  },
  primaryButtonPressed: {
    opacity: 0.82,
  },
  primaryButtonLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onAccent,
  },
  resendButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resendLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  error: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.danger,
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.6,
  },
});
