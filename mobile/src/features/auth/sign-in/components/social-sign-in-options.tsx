import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { useCopy } from '@/features/app-shell/localization/language';
import { AnimatedReveal } from '@/features/app-shell/motion/animated-reveal';

import { authCopy } from '../../auth-copy';
import { authColors as colors } from '../../auth-theme';
import type { SocialStrategy } from '../use-social-sign-in';
import { SocialButton } from './social-button';

interface SocialSignInOptionsProps {
  activeStrategy: SocialStrategy | null;
  isDisabled: boolean;
  onSignIn: (strategy: SocialStrategy) => void;
}

export function SocialSignInOptions({ activeStrategy, isDisabled, onSignIn }: SocialSignInOptionsProps) {
  const copy = useCopy(authCopy);
  const { fontScale } = useWindowDimensions();

  return (
    <AnimatedReveal style={styles.alternatives}>
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerLabel}>{copy.or}</Text>
        <View style={styles.dividerLine} />
      </View>
      <View style={[styles.socialButtons, fontScale > 1.3 && styles.socialButtonsStacked]}>
        <SocialButton
          isDisabled={isDisabled}
          isLoading={activeStrategy === 'oauth_google'}
          label={copy.continueWithGoogle}
          onPress={() => onSignIn('oauth_google')}
          provider="google"
        />
        <SocialButton
          isDisabled={isDisabled}
          isLoading={activeStrategy === 'oauth_apple'}
          label={copy.continueWithApple}
          onPress={() => onSignIn('oauth_apple')}
          provider="apple"
        />
      </View>
    </AnimatedReveal>
  );
}

const styles = StyleSheet.create({
  alternatives: {
    gap: 16,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  dividerLabel: {
    flexShrink: 1,
    fontSize: 12,
    color: colors.textSecondary,
  },
  socialButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  socialButtonsStacked: {
    flexDirection: 'column',
  },
});
