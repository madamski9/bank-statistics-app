import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { ScalePressable } from '@/features/app-shell/motion/scale-pressable';

import { AuthIcon } from '../../auth-icon';
import { authColors as colors } from '../../auth-theme';

interface SubmitButtonProps {
  label: string;
  isDisabled: boolean;
  isSubmitting: boolean;
  onPress: () => void;
}

export function SubmitButton({ label, isDisabled, isSubmitting, onPress }: SubmitButtonProps) {
  return (
    <ScalePressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: isSubmitting }}
      containerStyle={isDisabled && styles.disabled}
      disabled={isDisabled}
      onPress={onPress}
      pressedScale={0.98}
      style={styles.primaryButton}
    >
      <Text style={styles.primaryButtonLabel}>{label}</Text>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {isSubmitting ? (
          <ActivityIndicator color={colors.onAccent} size="small" />
        ) : (
          <AuthIcon name="arrow" color={colors.onAccent} />
        )}
      </View>
    </ScalePressable>
  );
}

interface TextLinkButtonProps {
  label: string;
  isDisabled: boolean;
  onPress: () => void;
}

export function ResendButton({ label, isDisabled, onPress }: TextLinkButtonProps) {
  return (
    <ScalePressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      containerStyle={isDisabled && styles.disabled}
      disabled={isDisabled}
      onPress={onPress}
      style={styles.resendButton}
    >
      <Text style={styles.resendLabel}>{label}</Text>
    </ScalePressable>
  );
}

const styles = StyleSheet.create({
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
  disabled: {
    opacity: 0.5,
  },
});
