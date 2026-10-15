import { SymbolView } from 'expo-symbols';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCopy } from '@/features/app-shell/localization/language';
import { overviewColors, overviewSpacing } from '@/features/app-shell/theme/overview-theme';

import { biometricLabels } from '../app-lock/biometrics';
import { usePrivacy } from '../privacy-provider';
import { privacyCopy } from '../privacy-copy';
import { lockTimeouts } from '../privacy-settings';
import { NavigationRow, RadioRow, SettingsSection, ToggleRow } from './components/settings-rows';
import { VerificationModal } from './components/verification-modal';
import { useProtectedSettings } from './use-protected-settings';

interface PrivacySettingsScreenProps {
  onClose: () => void;
}

export function PrivacySettingsScreen({ onClose }: PrivacySettingsScreenProps) {
  const copy = useCopy(privacyCopy);
  const insets = useSafeAreaInsets();
  const { settings, hasPin, biometric } = usePrivacy();
  const protectedSettings = useProtectedSettings();
  const { save } = protectedSettings;
  const biometricName = biometric === 'none' ? null : biometricLabels[biometric];

  return (
    <View style={[styles.screen, styles.sheetTop]}>
      <View style={styles.header}>
        <Text accessibilityRole="header" maxFontSizeMultiplier={1.35} style={styles.title}>
          {copy.title}
        </Text>
        <Pressable
          accessibilityLabel={copy.closeLabel}
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
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <SettingsSection label={copy.lockSection}>
          <ToggleRow
            description={
              biometricName === null
                ? copy.lockWithPinDescription
                : copy.lockWithBiometricDescription(biometricName)
            }
            label={biometricName === null ? copy.lockWithPin : copy.lockWithBiometric(biometricName)}
            onChange={(isEnabled) => protectedSettings.toggleProtected('isLockEnabled', isEnabled)}
            value={settings.isLockEnabled}
          />
          {settings.isLockEnabled
            ? lockTimeouts.map((timeout) => (
                <RadioRow
                  isSelected={settings.lockTimeout === timeout}
                  key={timeout}
                  label={copy.lockTimeouts[timeout]}
                  onPress={() => void save({ lockTimeout: timeout })}
                />
              ))
            : null}
          <NavigationRow
            label={hasPin ? copy.changePin : copy.setPin}
            onPress={protectedSettings.requestPinChange}
          />
        </SettingsSection>

        <SettingsSection label={copy.privacySection}>
          <ToggleRow
            description={copy.privacyModeDescription}
            label={copy.privacyMode}
            onChange={(isEnabled) => void save({ isPrivacyModeEnabled: isEnabled })}
            value={settings.isPrivacyModeEnabled}
          />
          <ToggleRow
            description={
              biometricName === null
                ? copy.blurWidgetPinDescription
                : copy.blurWidgetBiometricDescription(biometricName)
            }
            label={copy.blurWidget}
            onChange={(isBlurred) => protectedSettings.toggleProtected('isWidgetBlurred', isBlurred)}
            value={settings.isWidgetBlurred}
          />
        </SettingsSection>

        {protectedSettings.error !== null ? (
          <Text accessibilityLiveRegion="polite" maxFontSizeMultiplier={1.5} style={styles.error}>
            {protectedSettings.error}
          </Text>
        ) : null}
      </ScrollView>

      <VerificationModal
        onCancel={protectedSettings.cancelPending}
        onConfirmed={() => void protectedSettings.finishPending()}
        onPinChosen={protectedSettings.completePin}
        pending={protectedSettings.pending}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sheetTop: {
    paddingTop: 14,
  },
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
    letterSpacing: -0.5,
    color: overviewColors.textPrimary,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: overviewColors.surfacePressed,
  },
  content: {
    gap: overviewSpacing.section,
    paddingHorizontal: overviewSpacing.gutter,
    paddingTop: overviewSpacing.block,
  },
  error: {
    fontSize: 13,
    lineHeight: 18,
    color: overviewColors.negative,
  },
  pressed: {
    opacity: 0.6,
  },
});
