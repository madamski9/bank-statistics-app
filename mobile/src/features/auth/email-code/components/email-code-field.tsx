import { StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useCopy } from '@/features/app-shell/localization/language';
import { AnimatedReveal } from '@/features/app-shell/motion/animated-reveal';
import { ScalePressable } from '@/features/app-shell/motion/scale-pressable';

import { authCopy } from '../../auth-copy';
import { AuthIcon } from '../../auth-icon';
import { authMotion } from '../../auth-motion';
import { authColors as colors } from '../../auth-theme';
import type { EmailCodeStep } from '../use-email-code-flow';

interface EmailCodeFieldProps {
  step: EmailCodeStep;
  email: string;
  value: string;
  hasError: boolean;
  isBusy: boolean;
  onChangeValue: (value: string) => void;
  onChangeEmail: () => void;
  onFocusChange?: (isFocused: boolean) => void;
  onSubmit: () => void;
}

export function EmailCodeField({
  step,
  email,
  value,
  hasError,
  isBusy,
  onChangeValue,
  onChangeEmail,
  onFocusChange,
  onSubmit,
}: EmailCodeFieldProps) {
  const copy = useCopy(authCopy);
  const focus = useSharedValue(0);
  const isEmailStep = step === 'email';

  const fieldStyle = useAnimatedStyle(() => ({
    borderColor: hasError
      ? colors.danger
      : interpolateColor(focus.get(), [0, 1], [colors.controlBorder, colors.accent]),
    backgroundColor: interpolateColor(focus.get(), [0, 1], [colors.input, colors.inputFocused]),
  }));

  const changeFocus = (isFocused: boolean) => {
    focus.set(withTiming(isFocused ? 1 : 0, authMotion.focus));
    onFocusChange?.(isFocused);
  };

  return (
    <AnimatedReveal key={step} style={styles.fieldGroup}>
      <View style={styles.fieldHeading}>
        <Text style={styles.label}>
          {isEmailStep ? copy.emailAddress : copy.emailCode}
        </Text>
        {!isEmailStep ? (
          <ScalePressable
            accessibilityRole="button"
            accessibilityState={{ disabled: isBusy }}
            containerStyle={isBusy && styles.disabled}
            disabled={isBusy}
            onPress={onChangeEmail}
            style={styles.textButton}
          >
            <Text style={styles.textButtonLabel}>{copy.change}</Text>
          </ScalePressable>
        ) : null}
      </View>
      {!isEmailStep ? (
        <Text style={styles.helper}>{copy.sentTo(email)}</Text>
      ) : null}
      <Animated.View style={[styles.inputContainer, fieldStyle]}>
        {isEmailStep ? (
          <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <AuthIcon name="mail" color={colors.textSecondary} />
          </View>
        ) : null}
        <TextInput
          accessibilityLabel={isEmailStep ? copy.emailAddress : copy.emailCode}
          accessibilityHint={isEmailStep ? copy.passwordless : copy.enterCode}
          aria-invalid={hasError}
          autoCapitalize="none"
          autoComplete={isEmailStep ? 'email' : 'one-time-code'}
          autoCorrect={false}
          autoFocus={!isEmailStep}
          editable={!isBusy}
          keyboardType={isEmailStep ? 'email-address' : 'number-pad'}
          maxLength={isEmailStep ? undefined : 8}
          onBlur={() => changeFocus(false)}
          onChangeText={onChangeValue}
          onFocus={() => changeFocus(true)}
          onSubmitEditing={onSubmit}
          placeholder={isEmailStep ? copy.emailPlaceholder : '000000'}
          placeholderTextColor={colors.textSecondary}
          returnKeyType={isEmailStep ? 'send' : 'done'}
          selectionColor={colors.accent}
          selectTextOnFocus={!isEmailStep}
          style={[styles.input, !isEmailStep && styles.codeInput]}
          textContentType={isEmailStep ? 'emailAddress' : 'oneTimeCode'}
          value={value}
        />
      </Animated.View>
      {isEmailStep ? <Text style={styles.helper}>{copy.passwordless}</Text> : null}
    </AnimatedReveal>
  );
}

const styles = StyleSheet.create({
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
  disabled: {
    opacity: 0.5,
  },
});
