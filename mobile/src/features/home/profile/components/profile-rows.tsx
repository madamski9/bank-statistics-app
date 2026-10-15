import { SymbolView } from 'expo-symbols';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { overviewColors } from '@/features/app-shell/theme/overview-theme';

type SymbolName = ComponentProps<typeof SymbolView>['name'];

interface ProfileSectionProps {
  label: string;
  children: ReactNode;
}

export function ProfileSection({ label, children }: ProfileSectionProps) {
  return (
    <View style={styles.section}>
      <Text maxFontSizeMultiplier={1.4} style={styles.sectionLabel}>
        {label}
      </Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function RowIcon({ symbol, size }: { symbol: SymbolName; size: number }) {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no" style={styles.rowIcon}>
      <SymbolView name={symbol} size={size} tintColor={overviewColors.textSecondary} />
    </View>
  );
}

interface ProfileInfoRowProps {
  symbol: SymbolName;
  label: string;
  value: string;
  accessibilityLabel: string;
  isLive?: boolean;
  isSingleLine?: boolean;
}

export function ProfileInfoRow({ symbol, label, value, accessibilityLabel, isLive = false, isSingleLine = false }: ProfileInfoRowProps) {
  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel}
      accessibilityLiveRegion={isLive ? 'polite' : undefined}
      style={styles.row}
    >
      <RowIcon size={17} symbol={symbol} />
      <View style={styles.rowCopy}>
        <Text maxFontSizeMultiplier={1.4} style={styles.rowLabel}>
          {label}
        </Text>
        <Text maxFontSizeMultiplier={1.5} numberOfLines={isSingleLine ? 1 : undefined} style={styles.rowValue}>
          {value}
        </Text>
      </View>
    </View>
  );
}

interface ProfileActionRowProps {
  symbol: SymbolName;
  label: string;
  value?: string;
  accessibilityHint?: string;
  accessibilityLabel?: string;
  hasChevron?: boolean;
  onPress: () => void;
}

export function ProfileActionRow({
  symbol,
  label,
  value,
  accessibilityHint,
  accessibilityLabel,
  hasChevron = true,
  onPress,
}: ProfileActionRowProps) {
  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed ? styles.rowPressed : null]}
    >
      <RowIcon size={18} symbol={symbol} />
      <Text maxFontSizeMultiplier={1.4} style={styles.actionLabel}>
        {label}
      </Text>
      {value !== undefined ? (
        <Text maxFontSizeMultiplier={1.4} style={styles.actionValue}>
          {value}
        </Text>
      ) : null}
      {hasChevron ? (
        <SymbolView
          accessibilityElementsHidden
          importantForAccessibility="no"
          name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
          size={17}
          tintColor={overviewColors.textDisabled}
        />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 9,
  },
  sectionLabel: {
    paddingHorizontal: 4,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.7,
    color: overviewColors.textSecondary,
  },
  card: {
    overflow: 'hidden',
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: overviewColors.hairline,
    backgroundColor: overviewColors.surface,
  },
  row: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
  },
  rowPressed: {
    backgroundColor: overviewColors.surfacePressed,
  },
  rowIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: overviewColors.surfacePressed,
  },
  rowCopy: {
    flex: 1,
    gap: 3,
  },
  rowLabel: {
    fontSize: 13,
    color: overviewColors.textSecondary,
  },
  rowValue: {
    fontSize: 15,
    fontWeight: '500',
    color: overviewColors.textPrimary,
  },
  actionValue: {
    fontSize: 15,
    color: overviewColors.textSecondary,
  },
  actionLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: overviewColors.textPrimary,
  },
});
