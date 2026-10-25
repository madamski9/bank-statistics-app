import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { AnimatedReveal } from '@/features/app-shell/motion/animated-reveal';
import { overviewColors } from '@/features/app-shell/theme/overview-theme';

import { onboardingColors } from '../onboarding-motion';

interface FeatureRowProps {
  delay?: number;
  symbol: 'chart.bar.fill' | 'lock.shield.fill' | 'bell.badge.fill' | 'calendar' | 'iphone' | 'square.and.pencil';
  title: string;
  description: string;
}

export function FeatureRow({ delay = 140, symbol, title, description }: FeatureRowProps) {
  return (
    <AnimatedReveal delay={delay} style={styles.featureRow}>
      <View style={styles.featureIcon}>
        <SymbolView
          name={{ ios: symbol, android: 'check_circle', web: 'check_circle' }}
          size={19}
          tintColor={overviewColors.positive}
        />
      </View>
      <View style={styles.featureCopy}>
        <Text maxFontSizeMultiplier={1.4} style={styles.featureTitle}>
          {title}
        </Text>
        <Text maxFontSizeMultiplier={1.5} style={styles.featureDescription}>
          {description}
        </Text>
      </View>
    </AnimatedReveal>
  );
}

const styles = StyleSheet.create({
  featureRow: { flexDirection: 'row', gap: 14, alignItems: 'flex-start', padding: 16, borderRadius: 20, backgroundColor: overviewColors.surface, borderWidth: 1, borderColor: overviewColors.hairline },
  featureIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: onboardingColors.positiveMuted,
  },
  featureCopy: { flex: 1, gap: 4 },
  featureTitle: {
    color: overviewColors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  featureDescription: {
    color: overviewColors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
});
