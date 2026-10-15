import { StyleSheet, Text } from 'react-native';

import { AnimatedReveal } from '@/features/app-shell/motion/animated-reveal';

import { AuthIcon } from '../../auth-icon';
import { authColors as colors } from '../../auth-theme';

export function ErrorNotice({ message }: { message: string }) {
  return (
    <AnimatedReveal style={styles.errorNotice}>
      <Text accessibilityLiveRegion="polite" style={styles.error}>{message}</Text>
    </AnimatedReveal>
  );
}

export function SuccessNotice({ message }: { message: string }) {
  return (
    <AnimatedReveal style={styles.successNotice}>
      <AuthIcon name="check" color={colors.positive} size={18} />
      <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text>
    </AnimatedReveal>
  );
}

const styles = StyleSheet.create({
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
});
