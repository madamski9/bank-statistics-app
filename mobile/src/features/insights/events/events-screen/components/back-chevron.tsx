import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet } from 'react-native';

import { overviewColors } from '@/features/app-shell/theme/overview-theme';

export function BackChevron({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.back, pressed ? styles.pressed : null]}
    >
      <SymbolView
        name={{ ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }}
        size={18}
        tintColor={overviewColors.textPrimary}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  back: {
    width: 36,
    height: 44,
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});
