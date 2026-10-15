import { StyleSheet, View } from 'react-native';

import { overviewColors } from '@/features/app-shell/theme/overview-theme';

interface LimitProgressBarProps {
  share: number;
}

const spendGradient = `linear-gradient(to right, ${overviewColors.positive} 0%, ${overviewColors.caution} 50%, ${overviewColors.negative} 100%)`;

export function LimitProgressBar({ share }: LimitProgressBarProps) {
  const filled = Math.min(Math.max(share, 0.02), 1);

  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${filled * 100}%` }]}>
        <View style={[styles.gradient, { width: `${100 / filled}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 5,
    overflow: 'hidden',
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
  },
  fill: {
    height: '100%',
    overflow: 'hidden',
    borderRadius: 3,
  },
  gradient: {
    height: '100%',
    experimental_backgroundImage: spendGradient,
  },
});
