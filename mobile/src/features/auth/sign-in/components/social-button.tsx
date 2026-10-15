import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';

import { ScalePressable } from '@/features/app-shell/motion/scale-pressable';

import { authColors as colors } from '../../auth-theme';
import { appleSignInIcon, googleSignInIcon } from '../social-provider-assets';

interface SocialButtonProps {
  label: string;
  provider: 'google' | 'apple';
  isDisabled: boolean;
  isLoading: boolean;
  onPress: () => void;
}

export function SocialButton({ label, provider, isDisabled, isLoading, onPress }: SocialButtonProps) {
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
});
