import { StyleSheet, View } from 'react-native';

import { useCopy } from '@/features/app-shell/localization/language';

import { authCopy } from '../auth-copy';
import { EmailCodeField } from './components/email-code-field';
import { ResendButton, SubmitButton } from './components/form-buttons';
import { ErrorNotice, SuccessNotice } from './components/form-notices';
import { useEmailCodeFlow, type EmailCodeStep } from './use-email-code-flow';

interface EmailCodeSignInProps {
  isLocked?: boolean;
  onBusyChange?: (isBusy: boolean) => void;
  onFocusChange?: (isFocused: boolean) => void;
  onStepChange?: (step: EmailCodeStep) => void;
}

export function EmailCodeSignIn({
  isLocked = false,
  onBusyChange,
  onFocusChange,
  onStepChange,
}: EmailCodeSignInProps) {
  const copy = useCopy(authCopy);
  const flow = useEmailCodeFlow({ isLocked, onBusyChange, onStepChange });

  return (
    <View style={styles.form}>
      <EmailCodeField
        email={flow.email}
        hasError={flow.error !== null}
        isBusy={flow.isBusy}
        onChangeEmail={flow.changeEmail}
        onChangeValue={flow.changeValue}
        onFocusChange={onFocusChange}
        onSubmit={flow.submit}
        step={flow.step}
        value={flow.value}
      />

      {flow.error !== null ? <ErrorNotice message={flow.error} /> : null}
      {flow.message !== null ? <SuccessNotice message={flow.message} /> : null}

      <SubmitButton
        isDisabled={flow.isDisabled}
        isSubmitting={flow.isSubmitting}
        label={flow.step === 'email' ? copy.sendCode : copy.signIn}
        onPress={flow.submit}
      />

      {flow.step === 'code' ? (
        <ResendButton isDisabled={flow.isBusy} label={copy.resendCode} onPress={flow.resendCode} />
      ) : null}

      <View nativeID="clerk-captcha" />
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 16,
  },
});
