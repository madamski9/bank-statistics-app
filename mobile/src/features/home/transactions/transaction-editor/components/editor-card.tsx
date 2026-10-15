import type { ReactNode } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { overviewColors } from '@/features/app-shell/theme/overview-theme';

export function EditorCard({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

export function EditorSeparator() {
  return <View style={styles.separator} />;
}

interface EditorFieldProps {
  label: string;
  value: string;
  placeholder: string;
  keyboardType?: 'default' | 'numbers-and-punctuation';
  onChangeText: (value: string) => void;
}

export function EditorField({
  label,
  value,
  placeholder,
  keyboardType = 'default',
  onChangeText,
}: EditorFieldProps) {
  return (
    <View style={styles.field}>
      <Text maxFontSizeMultiplier={1.4} style={styles.fieldLabel}>
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        autoCorrect={false}
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={overviewColors.textDisabled}
        selectionColor={overviewColors.textPrimary}
        style={styles.fieldInput}
        value={value}
      />
    </View>
  );
}

export function EditorReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <View accessible style={styles.field}>
      <Text maxFontSizeMultiplier={1.4} style={styles.fieldLabel}>
        {label}
      </Text>
      <Text maxFontSizeMultiplier={1.4} numberOfLines={1} style={styles.fieldValue}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: overviewColors.hairline,
    backgroundColor: overviewColors.surface,
  },
  separator: {
    marginLeft: 14,
    height: StyleSheet.hairlineWidth,
    backgroundColor: overviewColors.hairline,
  },
  field: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
  },
  fieldLabel: {
    width: 92,
    fontSize: 14,
    color: overviewColors.textSecondary,
  },
  fieldValue: {
    flex: 1,
    fontSize: 16,
    color: overviewColors.textSecondary,
  },
  fieldInput: {
    flex: 1,
    fontSize: 16,
    color: overviewColors.textPrimary,
  },
});
