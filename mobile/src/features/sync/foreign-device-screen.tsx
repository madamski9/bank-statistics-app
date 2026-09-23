import { useClerk } from '@clerk/expo';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { overviewColors, overviewSpacing } from '@/features/spending-overview/overview-theme';

interface ForeignDeviceScreenProps {
  onTakeOver: () => Promise<void>;
}

export function ForeignDeviceScreen({ onTakeOver }: ForeignDeviceScreenProps) {
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
    Alert.alert(
      'Usunąć dane z tego telefonu?',
      'Transakcje, konta, reguły i limity poprzedniej osoby znikną z tego telefonu. To, co zdążyło się zsynchronizować, zostaje na jej koncie.',
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Usuń i kontynuuj',
          style: 'destructive',
          onPress: () =>
            void run(onTakeOver, 'Nie udało się usunąć danych z telefonu. Spróbuj ponownie.'),
        },
      ],
    );
  }, [onTakeOver, run]);

  return (
    <View
      style={[
        styles.screen,
        { paddingTop: insets.top + 48, paddingBottom: insets.bottom + overviewSpacing.block },
      ]}
    >
      <View style={styles.copy}>
        <Text accessibilityRole="header" maxFontSizeMultiplier={1.35} style={styles.title}>
          Ten telefon należy do innego konta
        </Text>
        <Text maxFontSizeMultiplier={1.5} style={styles.body}>
          Na tym telefonie są dane osoby, która wcześniej używała tu BankStats. Nie pokażemy ich i nie
          wyślemy na Twoje konto.
        </Text>
        <Text maxFontSizeMultiplier={1.5} style={styles.body}>
          Wyloguj się, żeby ta osoba mogła wrócić, albo usuń jej dane z telefonu i korzystaj z niego
          na swoim koncie.
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
          onPress={() => void run(signOut, 'Nie udało się wylogować. Spróbuj ponownie.')}
          style={({ pressed }) => [styles.primary, pressed ? styles.pressed : null]}
        >
          {isBusy ? (
            <ActivityIndicator color={overviewColors.textPrimary} />
          ) : (
            <Text maxFontSizeMultiplier={1.4} style={styles.primaryLabel}>
              Wyloguj się
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
            Usuń dane z telefonu i kontynuuj
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
