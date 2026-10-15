import { useSignIn, useSignUp } from '@clerk/expo';
import { useCallback, useEffect, useState } from 'react';

import { useCopy } from '@/features/app-shell/localization/language';

import { authCopy } from '../auth-copy';
import { isRejectedCode, needsSignUpTransfer } from './clerk-errors';

export type EmailCodeStep = 'email' | 'code';
type Mode = 'sign-in' | 'sign-up';

interface EmailCodeFlowOptions {
  isLocked: boolean;
  onBusyChange?: (isBusy: boolean) => void;
  onStepChange?: (step: EmailCodeStep) => void;
}

export function useEmailCodeFlow({ isLocked, onBusyChange, onStepChange }: EmailCodeFlowOptions) {
  const copy = useCopy(authCopy);
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const [step, setStep] = useState<EmailCodeStep>('email');
  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isBusy = isSubmitting || isLocked;

  useEffect(() => {
    onBusyChange?.(isSubmitting);
  }, [isSubmitting, onBusyChange]);

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

  const changeValue = useCallback(
    (value: string) => {
      setError(null);
      setMessage(null);
      if (step === 'email') {
        setEmail(value);
      } else {
        setCode(value);
      }
    },
    [step],
  );

  return {
    step,
    email,
    value: step === 'email' ? email : code,
    error,
    message,
    isSubmitting,
    isBusy,
    isDisabled: isBusy || (step === 'email' ? email.trim().length === 0 : code.length === 0),
    submit: step === 'email' ? requestCode : verifyCode,
    resendCode,
    changeEmail,
    changeValue,
  };
}
