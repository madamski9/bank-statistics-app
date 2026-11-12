import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useCopy } from '@/features/app-shell/localization/language';
import { overviewColors } from '@/features/app-shell/theme/overview-theme';
import { selectionChanged } from '@/haptics';

import { transactionsCopy } from '../../transactions-copy';

interface StopAwaitingWalletButtonProps {
  isDisabled: boolean;
  onPress: () => void;
}

export function StopAwaitingWalletButton({ isDisabled, onPress }: StopAwaitingWalletButtonProps) {
  const copy = useCopy(transactionsCopy);

  return (
    <View style={styles.section}>
      <Text maxFontSizeMultiplier={1.5} style={styles.help}>
        {copy.stopAwaitingWalletHelp}
      </Text>
      <Pressable
        accessibilityRole="button"
        disabled={isDisabled}
        onPress={() => {
          selectionChanged();
          onPress();
        }}
        style={({ pressed }) => [styles.button, pressed ? styles.pressed : null]}
      >
        <SymbolView
          name={{ ios: 'wallet.pass', android: 'wallet', web: 'wallet' }}
          size={16}
          tintColor={overviewColors.textPrimary}
        />
        <Text maxFontSizeMultiplier={1.4} numberOfLines={2} style={styles.label}>
          {copy.stopAwaitingWallet}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 10,
  },
  help: {
    fontSize: 14,
    lineHeight: 20,
    color: overviewColors.textSecondary,
  },
  button: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    borderRadius: 17,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: overviewColors.hairline,
    backgroundColor: overviewColors.surface,
  },
  label: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    color: overviewColors.textPrimary,
  },
  pressed: {
    opacity: 0.6,
  },
});
