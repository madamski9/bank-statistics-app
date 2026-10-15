import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useCopy } from '@/features/app-shell/localization/language';
import { overviewColors, overviewSpacing } from '@/features/app-shell/theme/overview-theme';

import { transactionsCopy } from '../../transactions-copy';

interface EditorHeaderProps {
  title: string;
  isWriting: boolean;
  onCancel: () => void;
  onSubmit: () => void;
}

export function EditorHeader({ title, isWriting, onCancel, onSubmit }: EditorHeaderProps) {
  const copy = useCopy(transactionsCopy);

  return (
    <View style={styles.header}>
      <Pressable
        accessibilityRole="button"
        hitSlop={8}
        onPress={onCancel}
        style={({ pressed }) => [styles.headerAction, pressed ? styles.pressed : null]}
      >
        <Text maxFontSizeMultiplier={1.3} style={styles.headerActionLabel}>
          {copy.cancel}
        </Text>
      </Pressable>
      <Text maxFontSizeMultiplier={1.3} style={styles.title}>
        {title}
      </Text>
      <Pressable
        accessibilityRole="button"
        disabled={isWriting}
        hitSlop={8}
        onPress={onSubmit}
        style={({ pressed }) => [
          styles.headerAction,
          styles.headerActionEnd,
          pressed ? styles.pressed : null,
        ]}
      >
        {isWriting ? (
          <ActivityIndicator color={overviewColors.textPrimary} />
        ) : (
          <Text maxFontSizeMultiplier={1.3} style={styles.submitLabel}>
            {copy.save}
          </Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: overviewSpacing.gutter,
    paddingTop: overviewSpacing.tight,
    paddingBottom: overviewSpacing.tight,
  },
  headerAction: {
    minWidth: 76,
    minHeight: 44,
    justifyContent: 'center',
  },
  headerActionEnd: {
    alignItems: 'flex-end',
  },
  headerActionLabel: {
    fontSize: 16,
    color: overviewColors.textSecondary,
  },
  submitLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: overviewColors.textPrimary,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '600',
    color: overviewColors.textPrimary,
  },
  pressed: {
    opacity: 0.6,
  },
});
