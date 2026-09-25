import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { overviewColors, overviewSpacing } from '@/features/spending-overview/overview-theme';

import { biometricLabels } from './biometrics';
import { lockoutLabel, pinLength } from './pin';
import { PinDots, PinPad } from './pin-pad';
import { usePrivacy } from './privacy-provider';

interface LockScreenProps {
  title: string;
  subtitle: string;
  promptMessage: string;
  onUnlocked: () => void;
  onCancel?: () => void;
}

export function LockScreen({ title, subtitle, promptMessage, onUnlocked, onCancel }: LockScreenProps) {
  const insets = useSafeAreaInsets();
  const { biometric, authenticate, checkPin, pinLockoutMs } = usePrivacy();
  const [pin, setPin] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [lockedForMs, setLockedForMs] = useState(() => pinLockoutMs());
  const hasPrompted = useRef(false);
  const [hasDeclinedBiometrics, setHasDeclinedBiometrics] = useState(false);

  const tryBiometrics = useCallback(async () => {
    if (biometric === 'none') {
      return;
    }

    const outcome = await authenticate(promptMessage);

    if (outcome === 'success') {
      onUnlocked();
      return;
    }

    setHasDeclinedBiometrics(true);

    if (outcome === 'usePin' || outcome === 'unavailable') {
      setMessage('Wpisz kod PIN.');
    }
  }, [authenticate, biometric, onUnlocked, promptMessage]);

  useEffect(() => {
    if (hasPrompted.current || biometric === 'none') {
      return;
    }

    hasPrompted.current = true;
    void tryBiometrics();
  }, [biometric, tryBiometrics]);

  useEffect(() => {
    if (lockedForMs <= 0) {
      return;
    }

    const interval = setInterval(() => setLockedForMs(pinLockoutMs()), 1000);

    return () => clearInterval(interval);
  }, [lockedForMs, pinLockoutMs]);

  const handleChange = useCallback(
    async (next: string) => {
      setHasError(false);
      setPin(next);

      if (next.length < pinLength) {
        return;
      }

      setIsChecking(true);
      const result = await checkPin(next);
      setIsChecking(false);
      setPin('');

      if (result.isCorrect) {
        onUnlocked();
        return;
      }

      setHasError(true);
      setLockedForMs(result.lockedForMs);
      setMessage(
        result.lockedForMs > 0
          ? 'Za dużo błędnych prób.'
          : 'Nieprawidłowy kod PIN. Spróbuj ponownie.',
      );
    },
    [checkPin, onUnlocked],
  );

  const isLockedOut = lockedForMs > 0;
  const isPinVisible = biometric === 'none' || hasDeclinedBiometrics;

  return (
    <View
      style={[
        styles.screen,
        { paddingTop: insets.top + 32, paddingBottom: insets.bottom + overviewSpacing.block },
      ]}
    >
      {isPinVisible ? (
        <Animated.View entering={FadeIn.duration(220)} style={styles.pinArea}>
          <View style={styles.header}>
            {onCancel !== undefined ? (
              <Pressable
                accessibilityRole="button"
                hitSlop={8}
                onPress={onCancel}
                style={({ pressed }) => [styles.cancel, pressed ? styles.pressed : null]}
              >
                <Text maxFontSizeMultiplier={1.3} style={styles.cancelLabel}>
                  Anuluj
                </Text>
              </Pressable>
            ) : null}
            <SymbolView
              name={{ ios: 'lock.fill', android: 'lock', web: 'lock' }}
              size={30}
              tintColor={overviewColors.textPrimary}
            />
            <Text accessibilityRole="header" maxFontSizeMultiplier={1.35} style={styles.title}>
              {title}
            </Text>
            <Text maxFontSizeMultiplier={1.5} style={styles.subtitle}>
              {subtitle}
            </Text>
          </View>

          <View style={styles.entry}>
            <PinDots filled={pin.length} hasError={hasError} />
            <Text accessibilityLiveRegion="polite" maxFontSizeMultiplier={1.5} style={styles.message}>
              {isLockedOut
                ? `Za dużo błędnych prób. Spróbuj za ${lockoutLabel(lockedForMs)}.`
                : (message ?? ' ')}
            </Text>
          </View>

          <PinPad
            biometric={
              biometric === 'none'
                ? undefined
                : {
                    label: biometricLabels[biometric],
                    symbol: biometric === 'faceId' ? 'faceid' : 'touchid',
                    onPress: () => void tryBiometrics(),
                  }
            }
            isDisabled={isChecking || isLockedOut}
            onChange={(next) => void handleChange(next)}
            value={pin}
          />
        </Animated.View>
      ) : null}
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
  header: {
    alignItems: 'center',
    gap: 10,
  },
  cancel: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
    marginBottom: 8,
  },
  cancelLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: overviewColors.textSecondary,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    color: overviewColors.textPrimary,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
    color: overviewColors.textSecondary,
  },
  pinArea: {
    flex: 1,
  },
  entry: {
    flex: 1,
    justifyContent: 'center',
    gap: 16,
  },
  message: {
    minHeight: 20,
    fontSize: 14,
    textAlign: 'center',
    color: overviewColors.negative,
  },
  pressed: {
    opacity: 0.6,
  },
});
