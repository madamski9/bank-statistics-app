import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
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

import { brandName } from '@/features/app-shell/brand/brand-artwork';
import { BrandMark } from '@/features/app-shell/brand/brand-mark';
import { AnimatedReveal } from '@/features/app-shell/motion/animated-reveal';

import { authEntering, authMotion } from '../auth-motion';
import { authColors as colors } from '../auth-theme';
import { EmailCodeSignIn } from '../email-code/email-code-sign-in';
import type { EmailCodeStep } from '../email-code/use-email-code-flow';
import { PrivacyNote } from './components/privacy-note';
import { SignInHeading } from './components/sign-in-heading';
import { SignInIllustration } from './components/sign-in-illustration';
import { SocialSignInOptions } from './components/social-sign-in-options';
import { useSocialSignIn } from './use-social-sign-in';
import { useWarmUpBrowser } from './use-warm-up-browser';

export function SignInScreen() {
  const insets = useSafeAreaInsets();
  const { height, fontScale } = useWindowDimensions();
  const isCompact = height < 740 || fontScale > 1.3;
  const [formStep, setFormStep] = useState<EmailCodeStep>('email');
  const [isFormFocused, setIsFormFocused] = useState(false);
  const [isEmailBusy, setIsEmailBusy] = useState(false);
  const social = useSocialSignIn();

  useWarmUpBrowser();

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

            <SignInHeading isCodeStep={formStep === 'code'} isCompact={isCompact} />

            <AnimatedReveal delay={200} layout={authMotion.layout} style={styles.formCard}>
              <EmailCodeSignIn
                isLocked={social.activeStrategy !== null}
                onBusyChange={setIsEmailBusy}
                onFocusChange={setIsFormFocused}
                onStepChange={setFormStep}
              />

              {formStep === 'email' ? (
                <SocialSignInOptions
                  activeStrategy={social.activeStrategy}
                  isDisabled={social.activeStrategy !== null || isEmailBusy}
                  onSignIn={(strategy) => void social.signInWith(strategy)}
                />
              ) : null}

              {social.error !== null ? (
                <Animated.Text
                  accessibilityLiveRegion="polite"
                  entering={authEntering()}
                  style={styles.socialError}
                >
                  {social.error}
                </Animated.Text>
              ) : null}
            </AnimatedReveal>

            <PrivacyNote />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
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
  formCard: {
    gap: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    backgroundColor: colors.surface,
  },
  socialError: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.danger,
  },
});
