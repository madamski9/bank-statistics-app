import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useCopy } from '@/features/app-shell/localization/language';
import { overviewColors, overviewSpacing } from '@/features/app-shell/theme/overview-theme';
import { impactLight } from '@/haptics';

import { transactionsCopy } from '../../transactions-copy';

interface ReviewBannerProps {
  prompt: string;
  isWriting: boolean;
  onConfirm?: () => void;
}

export function ReviewBanner({ prompt, isWriting, onConfirm }: ReviewBannerProps) {
  const copy = useCopy(transactionsCopy);

  return (
    <View style={styles.review}>
      <Text maxFontSizeMultiplier={1.5} style={styles.prompt}>
        {prompt}
      </Text>
      {onConfirm !== undefined ? (
        <Pressable
          accessibilityRole="button"
          disabled={isWriting}
          onPress={() => {
            impactLight();
            onConfirm();
          }}
          style={({ pressed }) => [styles.confirmButton, pressed ? styles.pressed : null]}
        >
          <Text maxFontSizeMultiplier={1.4} style={styles.confirmLabel}>
            {copy.confirmUnchanged}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  review: {
    gap: overviewSpacing.row,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 196, 107, 0.3)',
    backgroundColor: 'rgba(255, 196, 107, 0.08)',
    padding: 14,
  },
  prompt: {
    fontSize: 14,
    lineHeight: 20,
    color: overviewColors.caution,
  },
  confirmButton: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: 'rgba(255, 196, 107, 0.16)',
  },
  confirmLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: overviewColors.caution,
  },
  pressed: {
    opacity: 0.6,
  },
});
