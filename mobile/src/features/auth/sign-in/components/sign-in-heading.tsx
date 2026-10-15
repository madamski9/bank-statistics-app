import { StyleSheet, Text } from 'react-native';

import { useCopy } from '@/features/app-shell/localization/language';
import { AnimatedReveal } from '@/features/app-shell/motion/animated-reveal';

import { authCopy } from '../../auth-copy';
import { authMotion } from '../../auth-motion';
import { authColors as colors } from '../../auth-theme';

interface SignInHeadingProps {
  isCodeStep: boolean;
  isCompact: boolean;
}

export function SignInHeading({ isCodeStep, isCompact }: SignInHeadingProps) {
  const copy = useCopy(authCopy);

  return (
    <AnimatedReveal
      key={isCodeStep ? 'code' : 'email'}
      delay={100}
      layout={authMotion.layout}
      style={styles.heading}
    >
      <Text accessibilityRole="header" style={[styles.title, isCompact && styles.compactTitle]}>
        {isCodeStep ? (
          copy.checkMail
        ) : (
          <>
            {copy.titleFirstLine}
            {'\n'}
            <Text style={styles.titleAccent}>{copy.titleSecondLine}</Text>
          </>
        )}
      </Text>
      <Text style={styles.subtitle}>
        {isCodeStep ? copy.codeSubtitle : copy.subtitle}
      </Text>
    </AnimatedReveal>
  );
}

const styles = StyleSheet.create({
  heading: {
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '700',
    letterSpacing: -1.2,
    textAlign: 'center',
    color: colors.textPrimary,
  },
  compactTitle: {
    fontSize: 28,
    lineHeight: 34,
  },
  titleAccent: {
    color: colors.accentText,
  },
  subtitle: {
    maxWidth: 320,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    color: colors.textSecondary,
  },
});
