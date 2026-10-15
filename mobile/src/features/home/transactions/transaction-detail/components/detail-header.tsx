import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useCopy } from '@/features/app-shell/localization/language';
import { overviewColors, overviewSpacing } from '@/features/app-shell/theme/overview-theme';

import { transactionsCopy } from '../../transactions-copy';

interface DetailHeaderProps {
  onClose: () => void;
  onEdit: () => void;
}

export function DetailHeader({ onClose, onEdit }: DetailHeaderProps) {
  const copy = useCopy(transactionsCopy);

  return (
    <View style={styles.header}>
      <Pressable
        accessibilityRole="button"
        hitSlop={8}
        onPress={onClose}
        style={({ pressed }) => [styles.headerAction, pressed ? styles.pressed : null]}
      >
        <Text maxFontSizeMultiplier={1.3} style={styles.headerActionLabel}>
          {copy.close}
        </Text>
      </Pressable>
      <View style={styles.headerSpacer} />
      <Pressable
        accessibilityHint={copy.editHint}
        accessibilityLabel={copy.edit}
        accessibilityRole="button"
        hitSlop={8}
        onPress={onEdit}
        style={({ pressed }) => [styles.editButton, pressed ? styles.pressed : null]}
      >
        <SymbolView
          name={{ ios: 'pencil', android: 'edit', web: 'edit' }}
          size={15}
          tintColor={overviewColors.background}
          weight="semibold"
        />
        <Text maxFontSizeMultiplier={1.3} style={styles.editLabel}>
          {copy.edit}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: overviewSpacing.gutter,
    paddingVertical: overviewSpacing.tight,
  },
  headerAction: {
    minHeight: 44,
    justifyContent: 'center',
  },
  headerActionLabel: {
    fontSize: 16,
    color: overviewColors.textSecondary,
  },
  headerSpacer: {
    flex: 1,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: overviewColors.textPrimary,
  },
  editLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: overviewColors.background,
  },
  pressed: {
    opacity: 0.6,
  },
});
