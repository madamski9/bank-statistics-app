import { SymbolView } from 'expo-symbols';
import { StyleSheet } from 'react-native';

import { overviewColors } from '@/features/app-shell/theme/overview-theme';
import { selectionChanged } from '@/haptics';

import { ScalePressable } from '@/features/app-shell/motion/scale-pressable';

interface BackButtonProps {
  label: string;
  onPress: () => void;
}

export function BackButton({ label, onPress }: BackButtonProps) {
  return (
    <ScalePressable
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={8}
      onPress={() => {
        selectionChanged();
        onPress();
      }}
      pressedScale={0.88}
      style={styles.backButton}
    >
      <SymbolView
        name={{ ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }}
        size={17}
        tintColor={overviewColors.textPrimary}
      />
    </ScalePressable>
  );
}

const styles = StyleSheet.create({
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: overviewColors.surfacePressed,
  },
});
