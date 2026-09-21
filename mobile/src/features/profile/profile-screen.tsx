import { useClerk, useUser } from '@clerk/expo';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { accountInitial } from '@/features/profile/account-identity';
import { overviewColors, overviewSpacing } from '@/features/spending-overview/overview-theme';

interface ProfileScreenProps {
  onClose: () => void;
  onOpenDiagnostics: () => void;
}

export function ProfileScreen({ onClose, onOpenDiagnostics }: ProfileScreenProps) {
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const email = user?.primaryEmailAddress?.emailAddress ?? 'Brak adresu e-mail';
  const name = user?.fullName ?? user?.firstName ?? 'Twoje konto';
  const initial = accountInitial(user);

  const handleSignOut = useCallback(async () => {
    setError(null);
    setIsSigningOut(true);

    try {
      await signOut();
    } catch {
      setError('Nie udało się wylogować. Spróbuj ponownie.');
      setIsSigningOut(false);
    }
  }, [signOut]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 14 }]}>
      <View style={styles.header}>
        <Text maxFontSizeMultiplier={1.35} style={styles.title}>
          Profil
        </Text>
        <Pressable
          accessibilityLabel="Zamknij profil"
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
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.identity}>
          {user?.imageUrl ? (
            <Image accessible={false} contentFit="cover" source={user.imageUrl} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text maxFontSizeMultiplier={1.3} style={styles.avatarInitial}>
                {initial}
              </Text>
            </View>
          )}
          <View style={styles.identityCopy}>
            <Text maxFontSizeMultiplier={1.35} numberOfLines={1} style={styles.name}>
              {name}
            </Text>
            <Text maxFontSizeMultiplier={1.5} numberOfLines={1} style={styles.email}>
              {email}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text maxFontSizeMultiplier={1.4} style={styles.sectionLabel}>
            KONTO
          </Text>
          <View style={styles.card}>
            <View accessible accessibilityLabel={`Adres e-mail: ${email}`} style={styles.row}>
              <View accessibilityElementsHidden importantForAccessibility="no" style={styles.rowIcon}>
                <SymbolView
                  name={{ ios: 'envelope.fill', android: 'mail', web: 'mail' }}
                  size={17}
                  tintColor={overviewColors.textSecondary}
                />
              </View>
              <View style={styles.rowCopy}>
                <Text maxFontSizeMultiplier={1.4} style={styles.rowLabel}>
                  Adres e-mail
                </Text>
                <Text maxFontSizeMultiplier={1.5} numberOfLines={1} style={styles.rowValue}>
                  {email}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text maxFontSizeMultiplier={1.4} style={styles.sectionLabel}>
            APLIKACJA
          </Text>
          <View style={styles.card}>
            <Pressable
              accessibilityHint="Otwiera stan przechwytywania powiadomień bankowych"
              accessibilityRole="button"
              onPress={onOpenDiagnostics}
              style={({ pressed }) => [styles.row, pressed ? styles.rowPressed : null]}
            >
              <View accessibilityElementsHidden importantForAccessibility="no" style={styles.rowIcon}>
                <SymbolView
                  name={{
                    ios: 'waveform.path.ecg',
                    android: 'monitor_heart',
                    web: 'monitor_heart',
                  }}
                  size={18}
                  tintColor={overviewColors.textSecondary}
                />
              </View>
              <Text maxFontSizeMultiplier={1.4} style={styles.actionLabel}>
                Diagnostyka powiadomień
              </Text>
              <SymbolView
                accessibilityElementsHidden
                importantForAccessibility="no"
                name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
                size={17}
                tintColor={overviewColors.textDisabled}
              />
            </Pressable>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          disabled={isSigningOut}
          onPress={handleSignOut}
          style={({ pressed }) => [
            styles.signOutButton,
            isSigningOut ? styles.disabled : null,
            pressed ? styles.pressed : null,
          ]}
        >
          {isSigningOut ? (
            <ActivityIndicator color={overviewColors.negative} />
          ) : (
            <>
              <SymbolView
                accessibilityElementsHidden
                importantForAccessibility="no"
                name={{
                  ios: 'rectangle.portrait.and.arrow.right',
                  android: 'logout',
                  web: 'logout',
                }}
                size={18}
                tintColor={overviewColors.negative}
              />
              <Text maxFontSizeMultiplier={1.4} style={styles.signOutLabel}>
                Wyloguj się
              </Text>
            </>
          )}
        </Pressable>

        {error !== null ? (
          <Text accessibilityLiveRegion="polite" maxFontSizeMultiplier={1.5} style={styles.error}>
            {error}
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
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
    letterSpacing: -0.8,
    color: overviewColors.textPrimary,
  },
  closeButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    backgroundColor: overviewColors.surfacePressed,
  },
  content: {
    gap: 28,
    paddingHorizontal: overviewSpacing.gutter,
    paddingTop: 22,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: overviewColors.surfacePressed,
  },
  avatarFallback: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 36,
    backgroundColor: overviewColors.surfacePressed,
  },
  avatarInitial: {
    fontSize: 30,
    fontWeight: '600',
    letterSpacing: -0.4,
    color: overviewColors.textPrimary,
  },
  identityCopy: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: overviewColors.textPrimary,
  },
  email: {
    fontSize: 14,
    color: overviewColors.textSecondary,
  },
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
  actionLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: overviewColors.textPrimary,
  },
  signOutButton: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    borderRadius: 17,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 92, 122, 0.35)',
    backgroundColor: 'rgba(255, 92, 122, 0.08)',
  },
  signOutLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: overviewColors.negative,
  },
  error: {
    marginTop: -16,
    textAlign: 'center',
    fontSize: 13,
    color: overviewColors.negative,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.6,
  },
});
