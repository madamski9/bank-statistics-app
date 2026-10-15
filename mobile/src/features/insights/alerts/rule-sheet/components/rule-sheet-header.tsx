import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useCopy } from '@/features/app-shell/localization/language';
import { overviewColors, overviewSpacing } from '@/features/app-shell/theme/overview-theme';

import { alertsCopy } from '../../alerts-copy';

interface RuleSheetHeaderProps {
  title: string;
  isSaving: boolean;
  onCancel: () => void;
  onSave: () => void;
}

export function RuleSheetHeader({ title, isSaving, onCancel, onSave }: RuleSheetHeaderProps) {
  const copy = useCopy(alertsCopy);

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
        disabled={isSaving}
        hitSlop={8}
        onPress={onSave}
        style={({ pressed }) => [
          styles.headerAction,
          styles.headerActionEnd,
          pressed ? styles.pressed : null,
        ]}
      >
        {isSaving ? (
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
    justifyContent: 'space-between',
    paddingHorizontal: overviewSpacing.gutter,
    paddingTop: overviewSpacing.tight,
    paddingBottom: overviewSpacing.tight,
  },
  headerAction: {
    minWidth: 72,
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
    fontWeight: '600',
    color: overviewColors.textPrimary,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: overviewColors.textPrimary,
  },
  pressed: {
    opacity: 0.6,
  },
});
