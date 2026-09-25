import { SymbolView } from 'expo-symbols';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LimitProgressBar } from '@/features/alerts/limit-progress-bar';
import { useCopy } from '@/features/localization/language';
import { overviewColors, overviewSpacing } from '@/features/spending-overview/overview-theme';

import type { SpendingWidgetProps, WidgetLimitTone } from './widget-snapshot';
import { widgetsCopy } from './widgets-copy';

interface WidgetPreviewProps {
  props: SpendingWidgetProps;
  onClose: () => void;
}

const toneColors: Record<WidgetLimitTone, string> = {
  calm: overviewColors.positive,
  caution: overviewColors.caution,
  over: overviewColors.negative,
};

export function WidgetPreview({ props, onClose }: WidgetPreviewProps) {
  const copy = useCopy(widgetsCopy).preview;
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, styles.sheetTop]}>
      <View style={styles.header}>
        <Text accessibilityRole="header" maxFontSizeMultiplier={1.35} style={styles.title}>
          {copy.title}
        </Text>
        <Pressable
          accessibilityLabel={copy.close}
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
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Text maxFontSizeMultiplier={1.4} style={styles.caption}>
            {props.monthLabel.toUpperCase()}
          </Text>
          <Text maxFontSizeMultiplier={1.4} style={styles.caption}>
            {props.labels.spending}
          </Text>
          <Text maxFontSizeMultiplier={1.2} style={styles.total}>
            {props.expenseLabel}
          </Text>
          <Text maxFontSizeMultiplier={1.4} style={styles.caption}>
            {`${props.countLabel} · ${props.dailyLabel}`}
          </Text>
        </View>

        {props.limits.length > 0 ? (
          <View style={styles.card}>
            <Text maxFontSizeMultiplier={1.4} style={styles.caption}>
              {copy.limits}
            </Text>
            {props.limits.map((limit) => (
              <View key={limit.name} style={styles.limit}>
                <View style={styles.row}>
                  <Text maxFontSizeMultiplier={1.4} numberOfLines={1} style={styles.name}>
                    {limit.name}
                  </Text>
                  <Text maxFontSizeMultiplier={1.4} style={[styles.value, { color: toneColors[limit.tone] }]}>
                    {`${limit.spentLabel} / ${limit.targetLabel}`}
                  </Text>
                </View>
                <LimitProgressBar share={limit.share} />
                <Text maxFontSizeMultiplier={1.4} style={styles.caption}>
                  {`${limit.remainingLabel} · ${limit.daysLeftLabel}`}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {props.shops.length > 0 ? (
          <View style={styles.card}>
            <Text maxFontSizeMultiplier={1.4} style={styles.caption}>
              {copy.shops}
            </Text>
            {props.shops.map((shop, index) => (
              <View key={shop.name} style={styles.row}>
                <Text maxFontSizeMultiplier={1.4} style={styles.rank}>
                  {index + 1}
                </Text>
                <Text maxFontSizeMultiplier={1.4} numberOfLines={1} style={styles.name}>
                  {shop.name}
                </Text>
                <Text maxFontSizeMultiplier={1.4} style={[styles.value, styles.expense]}>
                  {shop.amountLabel}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        <Text maxFontSizeMultiplier={1.5} style={styles.note}>
          {copy.revealNote}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  sheetTop: {
    paddingTop: 14,
  },
  screen: {
    flex: 1,
    backgroundColor: overviewColors.background,
  },
  header: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: overviewSpacing.gutter,
  },
  title: {
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
    gap: overviewSpacing.block,
    paddingHorizontal: overviewSpacing.gutter,
    paddingTop: overviewSpacing.block,
  },
  card: {
    gap: overviewSpacing.tight,
    padding: overviewSpacing.block,
    borderRadius: 22,
    backgroundColor: overviewColors.surface,
  },
  caption: {
    fontSize: 12,
    fontWeight: '600',
    color: overviewColors.textSecondary,
  },
  total: {
    fontSize: 38,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    color: overviewColors.textPrimary,
  },
  limit: {
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: overviewSpacing.tight,
  },
  rank: {
    width: 16,
    fontSize: 13,
    fontWeight: '700',
    color: overviewColors.textSecondary,
  },
  name: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: overviewColors.textPrimary,
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  expense: {
    color: '#FF5C8A',
  },
  note: {
    fontSize: 13,
    lineHeight: 18,
    color: overviewColors.textSecondary,
  },
  pressed: {
    opacity: 0.6,
  },
});
