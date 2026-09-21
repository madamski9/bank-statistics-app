import { useSSO } from '@clerk/expo';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { SymbolView } from 'expo-symbols';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmailCodeSignIn } from './email-code-sign-in';
import { appleSignInIcon, googleSignInIcon } from './social-provider-assets';
import { useWarmUpBrowser } from './use-warm-up-browser';

const colors = {
  background: '#000000',
  surface: '#0D0D0F',
  border: 'rgba(255, 255, 255, 0.12)',
  textPrimary: '#FFFFFF',
  textSecondary: '#8E8E93',
  accent: '#8F7BFF',
  danger: '#FF5C7A',
};

type SocialStrategy = 'oauth_google' | 'oauth_apple';
type FormStep = 'email' | 'code';

export function SignInScreen() {
  const insets = useSafeAreaInsets();
  const { startSSOFlow } = useSSO();
  const [formStep, setFormStep] = useState<FormStep>('email');
  const [activeStrategy, setActiveStrategy] = useState<SocialStrategy | null>(null);
  const [socialError, setSocialError] = useState<string | null>(null);

  useWarmUpBrowser();

  const signInWith = useCallback(
    async (strategy: SocialStrategy) => {
      setSocialError(null);
      setActiveStrategy(strategy);

      try {
        const { createdSessionId, setActive, signUp } = await startSSOFlow({ strategy });

        if (createdSessionId && setActive) {
          await setActive({ session: createdSessionId });
          return;
        }

        if (signUp?.status === 'missing_requirements') {
          setSocialError('Nie udało się dokończyć logowania. Wybierz inną metodę.');
        }
      } catch {
        setSocialError('Logowanie nie powiodło się. Spróbuj ponownie.');
      } finally {
        setActiveStrategy(null);
      }
    },
    [startSSOFlow],
  );

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View
          style={[
            styles.content,
            { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 },
          ]}
        >
          <View style={styles.brandRow}>
            <View style={styles.brandMark}>
              <View style={styles.brandCore} />
            </View>
            <Text maxFontSizeMultiplier={1.3} style={styles.brandName}>
              BankStats
            </Text>
          </View>

          {formStep === 'email' ? (
            <View accessible={false} style={styles.orbit}>
              <View style={[styles.bubble, styles.bubblePink]} />
              <View style={[styles.bubble, styles.bubbleGreen]} />
              <View style={[styles.bubble, styles.bubbleBlue]} />
            </View>
          ) : null}

          <View style={styles.heading}>
            <Text maxFontSizeMultiplier={1.35} style={styles.title}>
              {formStep === 'email' ? (
                <>
                  Twoje finanse,{`\n`}w jednym miejscu
                </>
              ) : (
                'Sprawdź pocztę'
              )}
            </Text>
            {formStep === 'email' ? (
              <Text maxFontSizeMultiplier={1.5} style={styles.subtitle}>
                Zaloguj się, aby zobaczyć wydatki, wpływy i najważniejsze zmiany.
              </Text>
            ) : null}
          </View>

          <View style={styles.formCard}>
            <EmailCodeSignIn onStepChange={setFormStep} />

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text maxFontSizeMultiplier={1.3} style={styles.dividerLabel}>
                lub
              </Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.socialButtons}>
              <SocialIconButton
                isDisabled={activeStrategy !== null}
                isLoading={activeStrategy === 'oauth_google'}
                label="Kontynuuj z Google"
                onPress={() => signInWith('oauth_google')}
                provider="google"
              />
              <SocialIconButton
                isDisabled={activeStrategy !== null}
                isLoading={activeStrategy === 'oauth_apple'}
                label="Kontynuuj z Apple"
                onPress={() => signInWith('oauth_apple')}
                provider="apple"
              />
            </View>

            {socialError !== null ? (
              <Text
                accessibilityLiveRegion="polite"
                maxFontSizeMultiplier={1.5}
                style={styles.socialError}
              >
                {socialError}
              </Text>
            ) : null}
          </View>

          <Text maxFontSizeMultiplier={1.4} style={styles.privacy}>
            Logowanie służy wyłącznie do zabezpieczenia Twojego konta i synchronizacji danych.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

interface SocialIconButtonProps {
  label: string;
  provider: 'google' | 'apple';
  isDisabled: boolean;
  isLoading: boolean;
  onPress: () => void;
}

function SocialIconButton({
  label,
  provider,
  isDisabled,
  isLoading,
  onPress,
}: SocialIconButtonProps) {
  const indicatorColor = provider === 'apple' ? '#000000' : colors.textPrimary;

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.socialIconButton,
        provider === 'apple' ? styles.appleButton : styles.googleButton,
        isDisabled ? styles.socialButtonDisabled : null,
        pressed ? styles.socialButtonPressed : null,
      ]}
    >
      {isLoading ? (
        <ActivityIndicator color={indicatorColor} size="small" />
      ) : provider === 'google' ? (
        <View accessible={false} style={styles.googleIconMask}>
          <Image contentFit="contain" source={googleSignInIcon} style={styles.googleAsset} />
        </View>
      ) : Platform.OS === 'ios' ? (
        <SymbolView name="apple.logo" size={25} tintColor="#000000" />
      ) : (
        <Image
          accessible={false}
          contentFit="contain"
          source={appleSignInIcon}
          style={styles.icon}
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  brandMark: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'rgba(143, 123, 255, 0.55)',
    backgroundColor: 'rgba(143, 123, 255, 0.18)',
  },
  brandCore: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  brandName: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: colors.textPrimary,
  },
  orbit: {
    height: 82,
  },
  bubble: {
    position: 'absolute',
    borderWidth: 1,
  },
  bubblePink: {
    left: 4,
    top: 12,
    width: 70,
    height: 70,
    borderRadius: 35,
    borderColor: 'rgba(255, 92, 138, 0.62)',
    backgroundColor: 'rgba(255, 92, 138, 0.16)',
  },
  bubbleGreen: {
    left: 58,
    top: 0,
    width: 52,
    height: 52,
    borderRadius: 26,
    borderColor: 'rgba(61, 232, 160, 0.65)',
    backgroundColor: 'rgba(61, 232, 160, 0.13)',
  },
  bubbleBlue: {
    left: 98,
    top: 43,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderColor: 'rgba(95, 200, 255, 0.62)',
    backgroundColor: 'rgba(95, 200, 255, 0.14)',
  },
  heading: {
    gap: 8,
    marginTop: 12,
  },
  title: {
    fontSize: 30,
    lineHeight: 33,
    fontWeight: '700',
    letterSpacing: -1.2,
    color: colors.textPrimary,
  },
  subtitle: {
    maxWidth: 340,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  formCard: {
    gap: 14,
    marginTop: 18,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: 14,
    backgroundColor: colors.surface,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  dividerLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  socialButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  socialIconButton: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    overflow: 'hidden',
  },
  googleButton: {
    backgroundColor: '#131314',
  },
  appleButton: {
    backgroundColor: '#FFFFFF',
  },
  icon: {
    width: 54,
    height: 54,
  },
  googleIconMask: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  googleAsset: {
    position: 'absolute',
    width: 54,
    height: 54,
  },
  socialButtonPressed: {
    opacity: 0.72,
  },
  socialButtonDisabled: {
    opacity: 0.5,
  },
  socialError: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.danger,
  },
  privacy: {
    marginTop: 10,
    paddingHorizontal: 12,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSecondary,
  },
});
