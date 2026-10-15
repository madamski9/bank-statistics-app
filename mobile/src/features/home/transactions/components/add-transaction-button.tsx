import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCopy } from '@/features/app-shell/localization/language';
import { overviewColors, overviewSpacing } from '@/features/app-shell/theme/overview-theme';
import { impactLight } from '@/haptics';

import { transactionsCopy } from '../transactions-copy';

export function AddTransactionButton({ onPress }: { onPress: () => void }) {
  const copy = useCopy(transactionsCopy);
  const insets = useSafeAreaInsets();

  return (
    <Pressable
      accessibilityHint={copy.addHint}
      accessibilityLabel={copy.add}
      accessibilityRole="button"
      hitSlop={8}
      onPress={() => {
        impactLight();
        onPress();
      }}
      style={({ pressed }) => [
        styles.addButton,
        { bottom: insets.bottom + 24 },
        pressed ? styles.pressed : null,
      ]}
    >
      <SymbolView
        name={{ ios: 'plus', android: 'add', web: 'add' }}
        size={19}
        tintColor={overviewColors.background}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  addButton: {
    position: 'absolute',
    right: overviewSpacing.gutter,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: overviewColors.textPrimary,
  },
  pressed: {
    opacity: 0.6,
  },
});
