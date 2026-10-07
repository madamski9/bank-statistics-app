import { isClerkAPIResponseError, useSignIn, useSignUp } from '@clerk/expo';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { AnimatedReveal } from '@/features/app-shell/animated-reveal';
import { ScalePressable } from '@/features/app-shell/scale-pressable';
import { useCopy } from '@/features/localization/language';

import { authCopy } from './auth-copy';
import { AuthIcon } from './auth-icon';
import { authMotion } from './auth-motion';
import { authColors as colors } from './auth-theme';

type Step = 'email' | 'code';
type Mode = 'sign-in' | 'sign-up';

const rejectedCodeErrors = new Set(['form_code_incorrect', 'verification_expired', 'verification_failed']);

function clerkErrorCodes(error: { code: string } | null): string[] {
  if (error === null) {
    return [];
  }

  return isClerkAPIResponseError(error) ? error.errors.map((detail) => detail.code) : [error.code];
}

function isRejectedCode(error: { code: string } | null): boolean {
  return clerkErrorCodes(error).some((code) => rejectedCodeErrors.has(code));
}

function needsSignUpTransfer(error: { code: string } | null): boolean {
  return clerkErrorCodes(error).includes('sign_up_if_missing_transfer');
}

interface EmailCodeSignInProps {
  isLocked?: boolean;
  onBusyChange?: (isBusy: boolean) => void;
  onFocusChange?: (isFocused: boolean) => void;
  onStepChange?: (step: Step) => void;
}

export function EmailCodeSignIn({
  isLocked = false,
  onBusyChange,
  onFocusChange,
  onStepChange,
}: EmailCodeSignInProps) {
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
  const focus = useSharedValue(0);
  const isBusy = isSubmitting || isLocked;

  useEffect(() => {
    onBusyChange?.(isSubmitting);
  }, [isSubmitting, onBusyChange]);

  const fieldStyle = useAnimatedStyle(() => ({
    borderColor: error !== null
      ? colors.danger
      : interpolateColor(focus.get(), [0, 1], [colors.controlBorder, colors.accent]),
    backgroundColor: interpolateColor(focus.get(), [0, 1], [colors.input, colors.inputFocused]),
  }));

  const changeFocus = (isFocused: boolean) => {
    focus.set(withTiming(isFocused ? 1 : 0, authMotion.focus));
    onFocusChange?.(isFocused);
  };

  const requestCode = useCallback(async () => {
    if (isBusy) {
      return;
    }

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
  }, [copy, email, isBusy, onStepChange, signIn, signUp]);

  const verifyCode = useCallback(async () => {
    if (isBusy) {
      return;
    }

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

        if (signIn.isTransferable || needsSignUpTransfer(result.error)) {
          const created = await signUp.create({ transfer: true });

          if (created.error || signUp.status !== 'complete') {
            setError(copy.createFailed);
            return;
          }

          await signUp.finalize();
          return;
        }

        if (result.error) {
          setError(isRejectedCode(result.error) ? copy.invalidCode : copy.verifyFailed);
          return;
        }

        if (signIn.status === 'complete') {
          await signIn.finalize();
        }

        return;
      }

      const result = await signUp.verifications.verifyEmailCode({ code: code.trim() });

      if (result.error) {
        setError(isRejectedCode(result.error) ? copy.invalidCode : copy.verifyFailed);
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
  }, [code, copy, isBusy, mode, signIn, signUp]);

  const resendCode = useCallback(async () => {
    if (isBusy) {
      return;
    }

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
  }, [copy, isBusy, mode, signIn, signUp]);

  const changeEmail = useCallback(() => {
    signIn.reset();
    signUp.reset();
    setCode('');
    setError(null);
    setMessage(null);
    setStep('email');
    onStepChange?.('email');
  }, [onStepChange, signIn, signUp]);

  const isDisabled = isBusy || (step === 'email' ? email.trim().length === 0 : code.length === 0);

  return (
    <View style={styles.form}>
      <AnimatedReveal key={step} style={styles.fieldGroup}>
        <View style={styles.fieldHeading}>
          <Text style={styles.label}>
            {step === 'email' ? copy.emailAddress : copy.emailCode}
          </Text>
          {step === 'code' ? (
            <ScalePressable
              accessibilityRole="button"
              accessibilityState={{ disabled: isBusy }}
              containerStyle={isBusy && styles.disabled}
              disabled={isBusy}
              onPress={changeEmail}
              style={styles.textButton}
            >
              <Text style={styles.textButtonLabel}>{copy.change}</Text>
            </ScalePressable>
          ) : null}
        </View>
        {step === 'code' ? (
          <Text style={styles.helper}>{copy.sentTo(email)}</Text>
        ) : null}
        <Animated.View style={[styles.inputContainer, fieldStyle]}>
          {step === 'email' ? (
            <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <AuthIcon name="mail" color={colors.textSecondary} />
            </View>
          ) : null}
          <TextInput
            accessibilityLabel={step === 'email' ? copy.emailAddress : copy.emailCode}
            accessibilityHint={step === 'email' ? copy.passwordless : copy.enterCode}
            aria-invalid={error !== null}
            autoCapitalize="none"
            autoComplete={step === 'email' ? 'email' : 'one-time-code'}
            autoCorrect={false}
            autoFocus={step === 'code'}
            editable={!isBusy}
            keyboardType={step === 'email' ? 'email-address' : 'number-pad'}
            maxLength={step === 'code' ? 8 : undefined}
            onBlur={() => changeFocus(false)}
            onChangeText={(value) => {
              setError(null);
              setMessage(null);
              if (step === 'email') {
                setEmail(value);
              } else {
                setCode(value);
              }
            }}
            onFocus={() => changeFocus(true)}
            onSubmitEditing={step === 'email' ? requestCode : verifyCode}
            placeholder={step === 'email' ? copy.emailPlaceholder : '000000'}
            placeholderTextColor={colors.textSecondary}
            returnKeyType={step === 'email' ? 'send' : 'done'}
            selectionColor={colors.accent}
            selectTextOnFocus={step === 'code'}
            style={[styles.input, step === 'code' && styles.codeInput]}
            textContentType={step === 'email' ? 'emailAddress' : 'oneTimeCode'}
            value={step === 'email' ? email : code}
          />
        </Animated.View>
        {step === 'email' ? <Text style={styles.helper}>{copy.passwordless}</Text> : null}
      </AnimatedReveal>

      {error !== null ? (
        <AnimatedReveal style={styles.errorNotice}>
          <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text>
        </AnimatedReveal>
      ) : null}

      {message !== null ? (
        <AnimatedReveal style={styles.successNotice}>
          <AuthIcon name="check" color={colors.positive} size={18} />
          <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text>
        </AnimatedReveal>
      ) : null}

      <ScalePressable
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled, busy: isSubmitting }}
        containerStyle={isDisabled && styles.disabled}
        disabled={isDisabled}
        onPress={step === 'email' ? requestCode : verifyCode}
        pressedScale={0.98}
        style={styles.primaryButton}
      >
        <Text style={styles.primaryButtonLabel}>
          {step === 'email' ? copy.sendCode : copy.signIn}
        </Text>
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {isSubmitting ? (
            <ActivityIndicator color={colors.onAccent} size="small" />
          ) : (
            <AuthIcon name="arrow" color={colors.onAccent} />
          )}
        </View>
      </ScalePressable>

      {step === 'code' ? (
        <ScalePressable
          accessibilityRole="button"
          accessibilityState={{ disabled: isBusy }}
          containerStyle={isBusy && styles.disabled}
          disabled={isBusy}
          onPress={resendCode}
          style={styles.resendButton}
        >
          <Text style={styles.resendLabel}>{copy.resendCode}</Text>
        </ScalePressable>
      ) : null}

      <View nativeID="clerk-captcha" />
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 16,
  },
  fieldGroup: {
    gap: 10,
  },
  fieldHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  label: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 54,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.textPrimary,
  },
  codeInput: {
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: 8,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  helper: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  textButton: {
    minHeight: 48,
    minWidth: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  textButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.accentText,
  },
  primaryButton: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.accent,
  },
  primaryButtonLabel: {
    flexShrink: 1,
    fontSize: 16,
    fontWeight: '700',
    color: colors.onAccent,
  },
  resendButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  resendLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.accentText,
    textAlign: 'center',
  },
  errorNotice: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.dangerMuted,
  },
  error: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.danger,
  },
  successNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.successMuted,
  },
  message: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: colors.positive,
  },
  disabled: {
    opacity: 0.5,
  },
});
