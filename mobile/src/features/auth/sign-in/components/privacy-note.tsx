import { StyleSheet, Text, View } from 'react-native';

import { useCopy } from '@/features/app-shell/localization/language';
import { AnimatedReveal } from '@/features/app-shell/motion/animated-reveal';

import { authCopy } from '../../auth-copy';
import { AuthIcon } from '../../auth-icon';
import { authMotion } from '../../auth-motion';
import { authColors as colors } from '../../auth-theme';

export function PrivacyNote() {
  const copy = useCopy(authCopy);

  return (
    <AnimatedReveal delay={300} layout={authMotion.layout} style={styles.privacy}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.privacyIcon}>
        <AuthIcon name="shield" color={colors.textSecondary} size={16} />
      </View>
      <Text style={styles.privacyText}>{copy.privacy}</Text>
    </AnimatedReveal>
  );
}

const styles = StyleSheet.create({
  privacy: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    paddingHorizontal: 12,
  },
  privacyIcon: {
    marginTop: 2,
  },
  privacyText: {
    flexShrink: 1,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary,
  },
});
