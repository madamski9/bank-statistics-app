import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { overviewColors } from '@/features/app-shell/theme/overview-theme';
import { AmountText } from '@/features/settings/privacy/amounts/amount-text';

import { sheetRowStyles } from './sheet-row-styles';

interface SheetRowProps {
  label: string;
  detail?: string;
  value?: string;
  valueTone?: 'default' | 'positive' | 'negative' | 'caution' | 'muted';
  isFirst?: boolean;
  isSelected?: boolean;
  onPress?: () => void;
  accessibilityHint?: string;
}

export function SheetRow({
  label,
  detail,
  value,
  valueTone = 'default',
  isFirst = false,
  isSelected,
  onPress,
  accessibilityHint,
}: SheetRowProps) {
  const content = (
    <>
      <View style={sheetRowStyles.rowCopy}>
        <AmountText maxFontSizeMultiplier={1.4} numberOfLines={2} style={sheetRowStyles.rowLabel}>
          {label}
        </AmountText>
        {detail !== undefined ? (
          <Text maxFontSizeMultiplier={1.4} numberOfLines={2} style={sheetRowStyles.rowDetail}>
            {detail}
          </Text>
        ) : null}
      </View>
      {value !== undefined ? (
        <AmountText maxFontSizeMultiplier={1.4} numberOfLines={1} style={[styles.rowValue, toneStyles[valueTone]]}>
          {value}
        </AmountText>
      ) : null}
      {isSelected !== undefined ? (
        <SymbolView
          accessibilityElementsHidden
          importantForAccessibility="no"
          name={
            isSelected
              ? { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }
              : { ios: 'circle', android: 'radio_button_unchecked', web: 'radio_button_unchecked' }
          }
          size={22}
          tintColor={isSelected ? overviewColors.positive : overviewColors.textDisabled}
        />
      ) : onPress !== undefined ? (
        <SymbolView
          accessibilityElementsHidden
          importantForAccessibility="no"
          name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
          size={15}
          tintColor={overviewColors.textDisabled}
        />
      ) : null}
    </>
  );

  if (onPress === undefined) {
    return (
      <View accessible style={[sheetRowStyles.row, isFirst ? null : sheetRowStyles.rowDivider]}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityRole={isSelected === undefined ? 'button' : 'checkbox'}
      accessibilityState={isSelected === undefined ? undefined : { checked: isSelected }}
      onPress={onPress}
      style={({ pressed }) => [
        sheetRowStyles.row,
        isFirst ? null : sheetRowStyles.rowDivider,
        pressed ? styles.rowPressed : null,
      ]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  rowPressed: {
    backgroundColor: overviewColors.surfacePressed,
  },
  rowValue: {
    maxWidth: '50%',
    fontSize: 15,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
});

const toneStyles = StyleSheet.create({
  default: { color: overviewColors.textPrimary },
  positive: { color: overviewColors.positive },
  negative: { color: overviewColors.negative },
  caution: { color: overviewColors.caution },
  muted: { color: overviewColors.textSecondary },
});
