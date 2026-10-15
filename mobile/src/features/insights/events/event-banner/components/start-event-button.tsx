import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useCopy } from '@/features/app-shell/localization/language';
import { overviewColors } from '@/features/app-shell/theme/overview-theme';
import { impactLight } from '@/haptics';

import { eventsCopy } from '../../events-copy';
import { bannerStyles } from './banner-styles';

interface StartEventButtonProps {
  canStartEvent: boolean;
  onStart: () => void;
  onRequirePremium: () => void;
}

export function StartEventButton({ canStartEvent, onStart, onRequirePremium }: StartEventButtonProps) {
  const copy = useCopy(eventsCopy);

  return (
    <View style={bannerStyles.row}>
      <Pressable
        accessibilityHint={canStartEvent ? copy.bannerStartHint : copy.premiumHint}
        accessibilityLabel={copy.start}
        accessibilityRole="button"
        onPress={() => {
          impactLight();

          if (canStartEvent) {
            onStart();
          } else {
            onRequirePremium();
          }
        }}
        style={({ pressed }) => [bannerStyles.banner, styles.startBanner, pressed ? bannerStyles.pressed : null]}
      >
        <SymbolView
          name={{ ios: 'plus', android: 'add', web: 'add' }}
          size={13}
          tintColor={overviewColors.textSecondary}
          weight="semibold"
        />
        <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={styles.startLabel}>
          {copy.start}
        </Text>
        {canStartEvent ? null : (
          <SymbolView
            name={{ ios: 'lock.fill', android: 'lock', web: 'lock' }}
            size={12}
            tintColor={overviewColors.caution}
          />
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  startBanner: {
    flex: 1,
    minWidth: 0,
  },
  startLabel: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '600',
    color: overviewColors.textSecondary,
  },
});
