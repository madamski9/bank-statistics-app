import { useClerk } from '@clerk/expo';
import { SymbolView } from 'expo-symbols';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { useCopy } from '@/features/app-shell/localization/language';
import { overviewColors } from '@/features/app-shell/theme/overview-theme';

import { profileCopy } from '../profile-copy';

export function SignOutButton() {
  const copy = useCopy(profileCopy);
  const { signOut } = useClerk();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignOut = useCallback(async () => {
    setError(null);
    setIsSigningOut(true);

    try {
      await signOut();
    } catch {
      setError(copy.signOutFailed);
      setIsSigningOut(false);
    }
  }, [copy.signOutFailed, signOut]);

  return (
    <>
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
              {copy.signOut}
            </Text>
          </>
        )}
      </Pressable>

      {error !== null ? (
        <Text accessibilityLiveRegion="polite" maxFontSizeMultiplier={1.5} style={styles.error}>
          {error}
        </Text>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
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
