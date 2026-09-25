import { SymbolView } from 'expo-symbols';
import { useCallback, useState, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { overviewColors, overviewSpacing } from '@/features/spending-overview/overview-theme';

import { biometricLabels } from './biometrics';
import { LockScreen } from './lock-screen';
import { PinSetup } from './pin-setup';
import { usePrivacy } from './privacy-provider';
import { lockTimeoutLabels, lockTimeouts, type PrivacySettings } from './privacy-settings';

interface PrivacySettingsScreenProps {
  onClose: () => void;
}

type PendingStep =
  | { kind: 'confirm'; then: () => Promise<void> | void }
  | { kind: 'setPin'; then: () => Promise<void> | void };

export function PrivacySettingsScreen({ onClose }: PrivacySettingsScreenProps) {
  const insets = useSafeAreaInsets();
  const { settings, hasPin, biometric, updateSettings, changePin } = usePrivacy();
  const [pending, setPending] = useState<PendingStep | null>(null);
  const [error, setError] = useState<string | null>(null);
  const biometricName = biometric === 'none' ? null : biometricLabels[biometric];

  const save = useCallback(
    async (patch: Partial<PrivacySettings>) => {
      setError(null);

      try {
        await updateSettings(patch);
      } catch {
        setError('Nie udało się zapisać ustawień. Spróbuj ponownie.');
      }
    },
    [updateSettings],
  );

  const withPin = useCallback(
    (action: () => Promise<void>) => {
      if (hasPin) {
        void action();
      } else {
        setPending({ kind: 'setPin', then: action });
      }
    },
    [hasPin],
  );

  const confirmed = useCallback((action: () => Promise<void> | void) => {
    setPending({ kind: 'confirm', then: action });
  }, []);

  const finishPending = useCallback(async () => {
    const step = pending;
    setPending(null);
    await step?.then();
  }, [pending]);

  const toggleLock = (isEnabled: boolean) => {
    if (isEnabled) {
      withPin(() => save({ isLockEnabled: true }));
    } else {
      confirmed(() => save({ isLockEnabled: false }));
    }
  };

  const toggleWidgetBlur = (isBlurred: boolean) => {
    if (isBlurred) {
      withPin(() => save({ isWidgetBlurred: true }));
    } else {
      confirmed(() => save({ isWidgetBlurred: false }));
    }
  };

  const requestPinChange = () => {
    confirmed(() => setPending({ kind: 'setPin', then: () => undefined }));
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 14 }]}>
      <View style={styles.header}>
        <Text accessibilityRole="header" maxFontSizeMultiplier={1.35} style={styles.title}>
          Prywatność
        </Text>
        <Pressable
          accessibilityLabel="Zamknij ustawienia prywatności"
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
        <Section label="BLOKADA APLIKACJI">
          <ToggleRow
            description={
              biometricName === null
                ? 'Przy otwieraniu aplikacji zapytamy o kod PIN.'
                : `Przy otwieraniu aplikacji użyjesz ${biometricName}, a gdy się nie uda - kodu PIN.`
            }
            label={biometricName === null ? 'Blokuj kodem PIN' : `Blokuj przez ${biometricName}`}
            onChange={toggleLock}
            value={settings.isLockEnabled}
          />
          {settings.isLockEnabled
            ? lockTimeouts.map((timeout) => (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ checked: settings.lockTimeout === timeout }}
                  key={timeout}
                  onPress={() => void save({ lockTimeout: timeout })}
                  style={({ pressed }) => [styles.row, pressed ? styles.rowPressed : null]}
                >
                  <Text maxFontSizeMultiplier={1.4} style={styles.rowLabel}>
                    {lockTimeoutLabels[timeout]}
                  </Text>
                  {settings.lockTimeout === timeout ? (
                    <SymbolView
                      name={{ ios: 'checkmark', android: 'check', web: 'check' }}
                      size={17}
                      tintColor={overviewColors.positive}
                    />
                  ) : null}
                </Pressable>
              ))
            : null}
          <Pressable
            accessibilityRole="button"
            onPress={hasPin ? requestPinChange : () => setPending({ kind: 'setPin', then: () => undefined })}
            style={({ pressed }) => [styles.row, pressed ? styles.rowPressed : null]}
          >
            <Text maxFontSizeMultiplier={1.4} style={styles.rowLabel}>
              {hasPin ? 'Zmień kod PIN' : 'Ustaw kod PIN'}
            </Text>
            <SymbolView
              accessibilityElementsHidden
              importantForAccessibility="no"
              name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
              size={17}
              tintColor={overviewColors.textDisabled}
            />
          </Pressable>
        </Section>

        <Section label="PRYWATNOŚĆ">
          <ToggleRow
            description="Kwoty w aplikacji zamienią się w kropki. Przydaje się, gdy ktoś patrzy Ci przez ramię."
            label="Tryb prywatny"
            onChange={(isEnabled) => void save({ isPrivacyModeEnabled: isEnabled })}
            value={settings.isPrivacyModeEnabled}
          />
          <ToggleRow
            description={
              biometricName === null
                ? 'Widżet będzie rozmyty. Dotknij go i wpisz PIN, żeby go odsłonić na 5 minut.'
                : `Widżet będzie rozmyty. Dotknij go i użyj ${biometricName}, żeby go odsłonić na 5 minut.`
            }
            label="Rozmyj widżet"
            onChange={toggleWidgetBlur}
            value={settings.isWidgetBlurred}
          />
        </Section>

        {error !== null ? (
          <Text accessibilityLiveRegion="polite" maxFontSizeMultiplier={1.5} style={styles.error}>
            {error}
          </Text>
        ) : null}
      </ScrollView>

      <Modal
        animationType="slide"
        onRequestClose={() => setPending(null)}
        presentationStyle="fullScreen"
        visible={pending !== null}
      >
        {pending?.kind === 'confirm' ? (
          <LockScreen
            onCancel={() => setPending(null)}
            onUnlocked={() => void finishPending()}
            promptMessage="Potwierdź zmianę ustawień"
            subtitle="Potwierdź, że to Ty, zanim zmienisz zabezpieczenia."
            title="Potwierdź tożsamość"
          />
        ) : pending?.kind === 'setPin' ? (
          <View style={[styles.pinSheet, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 24 }]}>
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => setPending(null)}
              style={({ pressed }) => [styles.cancel, pressed ? styles.pressed : null]}
            >
              <Text maxFontSizeMultiplier={1.3} style={styles.cancelLabel}>
                Anuluj
              </Text>
            </Pressable>
            <PinSetup
              onComplete={async (pin) => {
                await changePin(pin);
                await finishPending();
              }}
            />
          </View>
        ) : null}
      </Modal>
    </View>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text maxFontSizeMultiplier={1.4} style={styles.sectionLabel}>
        {label}
      </Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function ToggleRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleCopy}>
        <Text maxFontSizeMultiplier={1.4} style={styles.rowLabel}>
          {label}
        </Text>
        <Text maxFontSizeMultiplier={1.5} style={styles.rowDescription}>
          {description}
        </Text>
      </View>
      <Switch
        accessibilityHint={description}
        accessibilityLabel={label}
        onValueChange={onChange}
        trackColor={{ true: overviewColors.positive, false: overviewColors.surfacePressed }}
        value={value}
      />
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
  section: {
    gap: overviewSpacing.tight,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.6,
    color: overviewColors.textSecondary,
  },
  card: {
    overflow: 'hidden',
    borderRadius: 18,
    backgroundColor: overviewColors.surface,
  },
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: overviewSpacing.block,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: overviewColors.hairline,
  },
  rowPressed: {
    backgroundColor: overviewColors.surfacePressed,
  },
  toggleRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: overviewSpacing.row,
    paddingHorizontal: overviewSpacing.block,
    paddingVertical: overviewSpacing.row,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: overviewColors.hairline,
  },
  toggleCopy: {
    flex: 1,
    gap: 3,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: overviewColors.textPrimary,
  },
  rowDescription: {
    fontSize: 13,
    lineHeight: 18,
    color: overviewColors.textSecondary,
  },
  error: {
    fontSize: 13,
    lineHeight: 18,
    color: overviewColors.negative,
  },
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
