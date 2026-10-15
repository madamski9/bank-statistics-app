import { SymbolView } from 'expo-symbols';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { overviewColors, overviewSpacing } from '@/features/app-shell/theme/overview-theme';

export function SettingsSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text maxFontSizeMultiplier={1.4} style={styles.sectionLabel}>
        {label}
      </Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

interface ToggleRowProps {
  label: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

export function ToggleRow({ label, description, value, onChange }: ToggleRowProps) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleCopy}>
        <Text maxFontSizeMultiplier={1.4} style={styles.rowLabel}>
          {label}
        </Text>
        <Text maxFontSizeMultiplier={1.5} style={styles.rowDescription}>
          {description}
        </Text>
      </View>
      <Switch
        accessibilityHint={description}
        accessibilityLabel={label}
        onValueChange={onChange}
        trackColor={{ true: overviewColors.positive, false: overviewColors.surfacePressed }}
        value={value}
      />
    </View>
  );
}

interface RadioRowProps {
  label: string;
  isSelected: boolean;
  onPress: () => void;
}

export function RadioRow({ label, isSelected, onPress }: RadioRowProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: isSelected }}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed ? styles.rowPressed : null]}
    >
      <Text maxFontSizeMultiplier={1.4} style={styles.rowLabel}>
        {label}
      </Text>
      {isSelected ? (
        <SymbolView
          name={{ ios: 'checkmark', android: 'check', web: 'check' }}
          size={17}
          tintColor={overviewColors.positive}
        />
      ) : null}
    </Pressable>
  );
}

export function NavigationRow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed ? styles.rowPressed : null]}
    >
      <Text maxFontSizeMultiplier={1.4} style={styles.rowLabel}>
        {label}
      </Text>
      <SymbolView
        accessibilityElementsHidden
        importantForAccessibility="no"
        name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
        size={17}
        tintColor={overviewColors.textDisabled}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: overviewSpacing.tight,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.6,
    color: overviewColors.textSecondary,
  },
  card: {
    overflow: 'hidden',
    borderRadius: 18,
    backgroundColor: overviewColors.surface,
  },
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: overviewSpacing.block,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: overviewColors.hairline,
  },
  rowPressed: {
    backgroundColor: overviewColors.surfacePressed,
  },
  toggleRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: overviewSpacing.row,
    paddingHorizontal: overviewSpacing.block,
    paddingVertical: overviewSpacing.row,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: overviewColors.hairline,
  },
  toggleCopy: {
    flex: 1,
    gap: 3,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: overviewColors.textPrimary,
  },
  rowDescription: {
    fontSize: 13,
    lineHeight: 18,
    color: overviewColors.textSecondary,
  },
});
