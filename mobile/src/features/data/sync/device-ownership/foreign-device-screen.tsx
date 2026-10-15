import { useClerk } from '@clerk/expo';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCopy } from '@/features/app-shell/localization/language';
import { overviewColors, overviewSpacing } from '@/features/app-shell/theme/overview-theme';

import { foreignDeviceCopy } from '../sync-copy';

interface ForeignDeviceScreenProps {
  onTakeOver: () => Promise<void>;
}

export function ForeignDeviceScreen({ onTakeOver }: ForeignDeviceScreenProps) {
  const copy = useCopy(foreignDeviceCopy);
  const insets = useSafeAreaInsets();
  const { signOut } = useClerk();
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (action: () => Promise<unknown>, failure: string) => {
    setError(null);
    setIsBusy(true);

    try {
      await action();
    } catch {
      setError(failure);
    } finally {
      setIsBusy(false);
    }
  }, []);

  const confirmTakeOver = useCallback(() => {
    Alert.alert(copy.confirmTitle, copy.confirmBody, [
      { text: copy.cancel, style: 'cancel' },
      {
        text: copy.removeAndContinue,
        style: 'destructive',
        onPress: () => void run(onTakeOver, copy.removeFailed),
      },
    ]);
  }, [copy, onTakeOver, run]);

  return (
    <View
      style={[
        styles.screen,
        { paddingTop: insets.top + 48, paddingBottom: insets.bottom + overviewSpacing.block },
      ]}
    >
      <View style={styles.copy}>
        <Text accessibilityRole="header" maxFontSizeMultiplier={1.35} style={styles.title}>
          {copy.title}
        </Text>
        <Text maxFontSizeMultiplier={1.5} style={styles.body}>
          {copy.ownerBody}
        </Text>
        <Text maxFontSizeMultiplier={1.5} style={styles.body}>
          {copy.choiceBody}
        </Text>
      </View>

      {error !== null ? (
        <Text accessibilityLiveRegion="polite" maxFontSizeMultiplier={1.5} style={styles.error}>
          {error}
        </Text>
      ) : null}

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          disabled={isBusy}
          onPress={() => void run(signOut, copy.signOutFailed)}
          style={({ pressed }) => [styles.primary, pressed ? styles.pressed : null]}
        >
          {isBusy ? (
            <ActivityIndicator color={overviewColors.textPrimary} />
          ) : (
            <Text maxFontSizeMultiplier={1.4} style={styles.primaryLabel}>
              {copy.signOut}
            </Text>
          )}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={isBusy}
          onPress={confirmTakeOver}
          style={({ pressed }) => [styles.destructive, pressed ? styles.pressed : null]}
        >
          <Text maxFontSizeMultiplier={1.4} style={styles.destructiveLabel}>
            {copy.removeData}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: overviewSpacing.gutter,
    backgroundColor: overviewColors.background,
  },
  copy: {
    gap: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: overviewColors.textPrimary,
  },
  body: {
    fontSize: 16,
    lineHeight: 23,
    color: overviewColors.textSecondary,
  },
  error: {
    fontSize: 13,
    lineHeight: 18,
    color: overviewColors.negative,
  },
  actions: {
    gap: 12,
  },
  primary: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: overviewColors.surfacePressed,
  },
  primaryLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: overviewColors.textPrimary,
  },
  destructive: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 92, 122, 0.35)',
    backgroundColor: 'rgba(255, 92, 122, 0.08)',
  },
  destructiveLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: overviewColors.negative,
  },
  pressed: {
    opacity: 0.6,
  },
});
