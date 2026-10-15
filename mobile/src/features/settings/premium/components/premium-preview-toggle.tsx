import { Pressable, StyleSheet, Text } from 'react-native';

import { useCopy } from '@/features/app-shell/localization/language';
import { overviewColors } from '@/features/app-shell/theme/overview-theme';

import { premiumCopy } from '../premium-copy';
import { setPreviewWithoutPremium } from '../premium-preview';

export function PremiumPreviewToggle({ isPreviewing }: { isPreviewing: boolean }) {
  const copy = useCopy(premiumCopy);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => setPreviewWithoutPremium(!isPreviewing)}
      style={({ pressed }) => [styles.preview, pressed ? styles.pressed : null]}
    >
      <Text maxFontSizeMultiplier={1.4} style={styles.previewLabel}>
        {isPreviewing ? copy.previewOff : copy.previewOn}
      </Text>
      <Text maxFontSizeMultiplier={1.4} style={styles.previewDetail}>
        {copy.previewDetail}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  preview: {
    gap: 4,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: overviewColors.textDisabled,
  },
  previewLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: overviewColors.textPrimary,
  },
  previewDetail: {
    fontSize: 12,
    color: overviewColors.textSecondary,
  },
  pressed: {
    opacity: 0.7,
  },
});
