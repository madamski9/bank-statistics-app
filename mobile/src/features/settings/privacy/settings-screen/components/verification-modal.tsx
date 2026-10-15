import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCopy } from '@/features/app-shell/localization/language';
import { overviewColors, overviewSpacing } from '@/features/app-shell/theme/overview-theme';

import { LockScreen } from '../../app-lock/lock-screen';
import { PinSetup } from '../../app-lock/pin-setup';
import { privacyCopy } from '../../privacy-copy';
import { PrivacyShield } from '../../privacy-shield';
import type { PendingStep } from '../use-protected-settings';

interface VerificationModalProps {
  pending: PendingStep | null;
  onCancel: () => void;
  onConfirmed: () => void;
  onPinChosen: (pin: string) => Promise<void>;
}

export function VerificationModal({ pending, onCancel, onConfirmed, onPinChosen }: VerificationModalProps) {
  const copy = useCopy(privacyCopy);
  const insets = useSafeAreaInsets();

  return (
    <Modal
      animationType="slide"
      onRequestClose={onCancel}
      presentationStyle="fullScreen"
      visible={pending !== null}
    >
      {pending?.kind === 'confirm' ? (
        <LockScreen
          onCancel={onCancel}
          onUnlocked={onConfirmed}
          promptMessage={copy.confirmPrompt}
          subtitle={copy.confirmSubtitle}
          title={copy.confirmTitle}
        />
      ) : pending?.kind === 'setPin' ? (
        <View style={[styles.pinSheet, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 24 }]}>
          <Pressable
            accessibilityRole="button"
            hitSlop={8}
            onPress={onCancel}
            style={({ pressed }) => [styles.cancel, pressed ? styles.pressed : null]}
          >
            <Text maxFontSizeMultiplier={1.3} style={styles.cancelLabel}>
              {copy.cancel}
            </Text>
          </Pressable>
          <PinSetup onComplete={onPinChosen} />
        </View>
      ) : null}
      <PrivacyShield />
    </Modal>
  );
}

const styles = StyleSheet.create({
  pinSheet: {
    flex: 1,
    gap: 32,
    paddingHorizontal: overviewSpacing.gutter,
    backgroundColor: overviewColors.background,
  },
  cancel: {
    minHeight: 44,
    justifyContent: 'center',
  },
  cancelLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: overviewColors.textSecondary,
  },
  pressed: {
    opacity: 0.6,
  },
});
