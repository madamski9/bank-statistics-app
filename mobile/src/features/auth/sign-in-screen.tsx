import { useSSO } from '@clerk/expo';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { SymbolView } from 'expo-symbols';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandMark } from '@/features/brand/brand-mark';
import { brandName } from '@/features/brand/brand-artwork';
import { AnimatedReveal } from '@/features/app-shell/animated-reveal';
import { ScalePressable } from '@/features/app-shell/scale-pressable';
import { useCopy } from '@/features/localization/language';

import { authCopy } from './auth-copy';
import { AuthIcon } from './auth-icon';
import { authEntering, authMotion } from './auth-motion';
import { authColors as colors } from './auth-theme';
import { EmailCodeSignIn } from './email-code-sign-in';
import { SignInIllustration } from './sign-in-illustration';
import { appleSignInIcon, googleSignInIcon } from './social-provider-assets';
import { useWarmUpBrowser } from './use-warm-up-browser';

type SocialStrategy = 'oauth_google' | 'oauth_apple';
type FormStep = 'email' | 'code';

export function SignInScreen() {
  const copy = useCopy(authCopy);
  const insets = useSafeAreaInsets();
  const { height, fontScale } = useWindowDimensions();
  const isCompact = height < 740 || fontScale > 1.3;
  const { startSSOFlow } = useSSO();
  const [formStep, setFormStep] = useState<FormStep>('email');
  const [activeStrategy, setActiveStrategy] = useState<SocialStrategy | null>(null);
  const [socialError, setSocialError] = useState<string | null>(null);
  const [isFormFocused, setIsFormFocused] = useState(false);
  const [isEmailBusy, setIsEmailBusy] = useState(false);

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
          setSocialError(copy.socialIncomplete);
        }
      } catch {
        setSocialError(copy.socialFailed);
      } finally {
        setActiveStrategy(null);
      }
    },
    [copy, startSSOFlow],
  );

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: insets.top + 20,
              paddingBottom: Math.max(insets.bottom, 16) + 12,
              paddingLeft: Math.max(insets.left, 20),
              paddingRight: Math.max(insets.right, 20),
            },
          ]}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <AnimatedReveal style={styles.brandRow}>
              <BrandMark size={32} />
              <Text style={styles.brandName}>{brandName}</Text>
            </AnimatedReveal>

            <SignInIllustration
              isCodeStep={formStep === 'code'}
              isCompact={isCompact}
              isFocused={isFormFocused}
            />

            <AnimatedReveal
              key={formStep}
              delay={100}
              layout={authMotion.layout}
              style={styles.heading}
            >
              <Text accessibilityRole="header" style={[styles.title, isCompact && styles.compactTitle]}>
                {formStep === 'email' ? (
                  <>
                    {copy.titleFirstLine}
                    {'\n'}
                    <Text style={styles.titleAccent}>{copy.titleSecondLine}</Text>
                  </>
                ) : (
                  copy.checkMail
                )}
              </Text>
              <Text style={styles.subtitle}>
                {formStep === 'email' ? copy.subtitle : copy.codeSubtitle}
              </Text>
            </AnimatedReveal>

            <AnimatedReveal delay={200} layout={authMotion.layout} style={styles.formCard}>
              <EmailCodeSignIn
                isLocked={activeStrategy !== null}
                onBusyChange={setIsEmailBusy}
                onFocusChange={setIsFormFocused}
                onStepChange={setFormStep}
              />

              {formStep === 'email' ? (
                <AnimatedReveal style={styles.alternatives}>
                  <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerLabel}>{copy.or}</Text>
                    <View style={styles.dividerLine} />
                  </View>
                  <View style={[styles.socialButtons, fontScale > 1.3 && styles.socialButtonsStacked]}>
                    <SocialButton
                      isDisabled={activeStrategy !== null || isEmailBusy}
                      isLoading={activeStrategy === 'oauth_google'}
                      label={copy.continueWithGoogle}
                      onPress={() => signInWith('oauth_google')}
                      provider="google"
                    />
                    <SocialButton
                      isDisabled={activeStrategy !== null || isEmailBusy}
                      isLoading={activeStrategy === 'oauth_apple'}
                      label={copy.continueWithApple}
                      onPress={() => signInWith('oauth_apple')}
                      provider="apple"
                    />
                  </View>
                </AnimatedReveal>
              ) : null}

              {socialError !== null ? (
                <Animated.Text
                  accessibilityLiveRegion="polite"
                  entering={authEntering()}
                  style={styles.socialError}
                >
                  {socialError}
                </Animated.Text>
              ) : null}
            </AnimatedReveal>

            <AnimatedReveal delay={300} layout={authMotion.layout} style={styles.privacy}>
              <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.privacyIcon}>
                <AuthIcon name="shield" color={colors.textSecondary} size={16} />
              </View>
              <Text style={styles.privacyText}>{copy.privacy}</Text>
            </AnimatedReveal>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

interface SocialButtonProps {
  label: string;
  provider: 'google' | 'apple';
  isDisabled: boolean;
  isLoading: boolean;
  onPress: () => void;
}

function SocialButton({ label, provider, isDisabled, isLoading, onPress }: SocialButtonProps) {
  const foreground = provider === 'apple' ? colors.background : colors.textPrimary;

  return (
    <ScalePressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: isLoading }}
      containerStyle={[styles.socialButtonContainer, isDisabled && styles.socialButtonDisabled]}
      disabled={isDisabled}
      onPress={onPress}
      pressedScale={0.97}
      style={[
        styles.socialButton,
        provider === 'apple' ? styles.appleButton : styles.googleButton,
      ]}
    >
      {isLoading ? (
        <ActivityIndicator color={foreground} size="small" />
      ) : (
        <>
          <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.providerIcon}>
            {provider === 'google' ? (
              <View style={styles.googleIconMask}>
                <Image contentFit="contain" source={googleSignInIcon} style={styles.googleAsset} />
              </View>
            ) : Platform.OS === 'ios' ? (
              <SymbolView name="apple.logo" size={22} tintColor={foreground} />
            ) : (
              <Image contentFit="contain" source={appleSignInIcon} style={styles.appleAsset} />
            )}
          </View>
          <Text style={[styles.socialButtonLabel, { color: foreground }]}>
            {provider === 'google' ? 'Google' : 'Apple'}
          </Text>
        </>
      )}
    </ScalePressable>
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
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 8,
  },
  brandName: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.4,
    color: colors.textPrimary,
  },
  heading: {
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '700',
    letterSpacing: -1.2,
    textAlign: 'center',
    color: colors.textPrimary,
  },
  compactTitle: {
    fontSize: 28,
    lineHeight: 34,
  },
  titleAccent: {
    color: colors.accentText,
  },
  subtitle: {
    maxWidth: 320,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    color: colors.textSecondary,
  },
  formCard: {
    gap: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    backgroundColor: colors.surface,
  },
  alternatives: {
    gap: 16,
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
    flexShrink: 1,
    fontSize: 12,
    color: colors.textSecondary,
  },
  socialButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  socialButtonsStacked: {
    flexDirection: 'column',
  },
  socialButtonContainer: {
    flex: 1,
  },
  socialButton: {
    flex: 1,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  googleButton: {
    backgroundColor: colors.google,
    borderColor: colors.controlBorder,
  },
  appleButton: {
    backgroundColor: colors.apple,
    borderColor: colors.apple,
  },
  socialButtonLabel: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  providerIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  appleAsset: {
    width: 46,
    height: 46,
  },
  googleIconMask: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  googleAsset: {
    width: 44,
    height: 44,
  },
  socialButtonDisabled: {
    opacity: 0.5,
  },
  socialError: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.danger,
  },
  privacy: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    paddingHorizontal: 12,
  },
  privacyIcon: {
    marginTop: 2,
  },
  privacyText: {
    flexShrink: 1,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary,
  },
});
