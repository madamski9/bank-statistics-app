import { SymbolView } from 'expo-symbols';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AmountText } from '@/features/privacy/amount-text';
import { overviewColors, overviewSpacing } from '@/features/spending-overview/overview-theme';

interface SheetLayoutProps {
  title: string;
  closeLabel: string;
  onClose: () => void;
  leading?: ReactNode;
  children: ReactNode;
}

export function SheetLayout({ title, closeLabel, onClose, leading, children }: SheetLayoutProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        {leading}
        <Text accessibilityRole="header" maxFontSizeMultiplier={1.35} numberOfLines={1} style={styles.title}>
          {title}
        </Text>
        <Pressable
          accessibilityLabel={closeLabel}
          accessibilityRole="button"
          hitSlop={8}
          onPress={onClose}
          style={({ pressed }) => [styles.closeButton, pressed ? styles.pressed : null]}
        >
          <SymbolView
            name={{ ios: 'xmark', android: 'close', web: 'close' }}
            size={18}
            tintColor={overviewColors.textPrimary}
          />
        </Pressable>
      </View>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        indicatorStyle="white"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </View>
  );
}

interface SheetSectionProps {
  label?: string;
  footnote?: string | null;
  children: ReactNode;
}

export function SheetSection({ label, footnote, children }: SheetSectionProps) {
  return (
    <View style={styles.section}>
      {label !== undefined ? (
        <AmountText maxFontSizeMultiplier={1.4} style={styles.sectionLabel}>
          {label.toLocaleUpperCase()}
        </AmountText>
      ) : null}
      <View style={styles.card}>{children}</View>
      {footnote !== undefined && footnote !== null ? (
        <Text maxFontSizeMultiplier={1.5} style={styles.footnote}>
          {footnote}
        </Text>
      ) : null}
    </View>
  );
}

interface SheetRowProps {
  label: string;
  detail?: string;
  value?: string;
  valueTone?: 'default' | 'positive' | 'negative' | 'caution' | 'muted';
  isFirst?: boolean;
  onPress?: () => void;
  accessibilityHint?: string;
}

export function SheetRow({
  label,
  detail,
  value,
  valueTone = 'default',
  isFirst = false,
  onPress,
  accessibilityHint,
}: SheetRowProps) {
  const content = (
    <>
      <View style={styles.rowCopy}>
        <AmountText maxFontSizeMultiplier={1.4} numberOfLines={2} style={styles.rowLabel}>
          {label}
        </AmountText>
        {detail !== undefined ? (
          <Text maxFontSizeMultiplier={1.4} numberOfLines={2} style={styles.rowDetail}>
            {detail}
          </Text>
        ) : null}
      </View>
      {value !== undefined ? (
        <AmountText maxFontSizeMultiplier={1.4} numberOfLines={1} style={[styles.rowValue, toneStyles[valueTone]]}>
          {value}
        </AmountText>
      ) : null}
      {onPress !== undefined ? (
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
      <View accessible style={[styles.row, isFirst ? null : styles.rowDivider]}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, isFirst ? null : styles.rowDivider, pressed ? styles.rowPressed : null]}
    >
      {content}
    </Pressable>
  );
}

interface SheetSwitchRowProps {
  label: string;
  detail?: string;
  value: boolean;
  disabled?: boolean;
  isFirst?: boolean;
  onChange: (value: boolean) => void;
}

export function SheetSwitchRow({
  label,
  detail,
  value,
  disabled = false,
  isFirst = false,
  onChange,
}: SheetSwitchRowProps) {
  return (
    <View style={[styles.row, isFirst ? null : styles.rowDivider]}>
      <View style={styles.rowCopy}>
        <AmountText maxFontSizeMultiplier={1.4} style={styles.rowLabel}>
          {label}
        </AmountText>
        {detail !== undefined ? (
          <Text maxFontSizeMultiplier={1.4} style={styles.rowDetail}>
            {detail}
          </Text>
        ) : null}
      </View>
      <Switch
        accessibilityLabel={label}
        disabled={disabled}
        onValueChange={onChange}
        trackColor={{ true: overviewColors.positive, false: overviewColors.surfacePressed }}
        value={value}
      />
    </View>
  );
}

interface SheetButtonProps {
  label: string;
  tone?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  onPress: () => void;
}

export function SheetButton({ label, tone = 'secondary', disabled = false, onPress }: SheetButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        buttonStyles[tone],
        disabled ? styles.disabled : null,
        pressed ? styles.pressed : null,
      ]}
    >
      <AmountText maxFontSizeMultiplier={1.4} style={[styles.buttonLabel, buttonLabelStyles[tone]]}>
        {label}
      </AmountText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingTop: 14,
    backgroundColor: overviewColors.background,
  },
  header: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: overviewSpacing.gutter,
  },
  title: {
    flex: 1,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: overviewColors.textPrimary,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: overviewColors.surfacePressed,
  },
  content: {
    gap: overviewSpacing.section,
    paddingHorizontal: overviewSpacing.gutter,
    paddingTop: overviewSpacing.block,
  },
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
  footnote: {
    fontSize: 13,
    lineHeight: 18,
    color: overviewColors.textSecondary,
  },
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: overviewSpacing.block,
    paddingVertical: 10,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: overviewColors.hairline,
  },
  rowPressed: {
    backgroundColor: overviewColors.surfacePressed,
  },
  rowCopy: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: overviewColors.textPrimary,
  },
  rowDetail: {
    fontSize: 12,
    lineHeight: 16,
    color: overviewColors.textSecondary,
  },
  rowValue: {
    maxWidth: '50%',
    fontSize: 15,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  button: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: overviewSpacing.block,
    borderRadius: 16,
  },
  buttonLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.6,
  },
});

const toneStyles = StyleSheet.create({
  default: { color: overviewColors.textPrimary },
  positive: { color: overviewColors.positive },
  negative: { color: overviewColors.negative },
  caution: { color: overviewColors.caution },
  muted: { color: overviewColors.textSecondary },
});

const buttonStyles = StyleSheet.create({
  primary: { backgroundColor: overviewColors.textPrimary },
  secondary: { backgroundColor: overviewColors.surfacePressed },
  danger: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 92, 122, 0.35)',
    backgroundColor: 'rgba(255, 92, 122, 0.08)',
  },
});

const buttonLabelStyles = StyleSheet.create({
  primary: { color: overviewColors.background },
  secondary: { color: overviewColors.textPrimary },
  danger: { color: overviewColors.negative },
});
