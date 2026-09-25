import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { impactLight } from '@/haptics';
import { overviewColors } from '@/features/spending-overview/overview-theme';

import { pinLength } from './pin';

interface PinPadProps {
  value: string;
  onChange: (value: string) => void;
  isDisabled?: boolean;
  biometric?: { label: string; symbol: 'faceid' | 'touchid'; onPress: () => void };
}

const digitRows = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
] as const;

export function PinDots({ filled, hasError = false }: { filled: number; hasError?: boolean }) {
  return (
    <View
      accessibilityLabel={`Wpisano ${filled} z ${pinLength} cyfr`}
      accessible
      style={styles.dots}
    >
      {Array.from({ length: pinLength }, (_, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            index < filled ? styles.dotFilled : null,
            hasError ? styles.dotError : null,
          ]}
        />
      ))}
    </View>
  );
}

export function PinPad({ value, onChange, isDisabled = false, biometric }: PinPadProps) {
  const press = (digit: string) => {
    if (isDisabled || value.length >= pinLength) {
      return;
    }

    impactLight();
    onChange(`${value}${digit}`);
  };

  const erase = () => {
    if (isDisabled || value.length === 0) {
      return;
    }

    onChange(value.slice(0, -1));
  };

  return (
    <View style={styles.pad}>
      {digitRows.map((row) => (
        <View key={row.join('')} style={styles.row}>
          {row.map((digit) => (
            <Key disabled={isDisabled} key={digit} label={digit} onPress={() => press(digit)} />
          ))}
        </View>
      ))}
      <View style={styles.row}>
        {biometric !== undefined ? (
          <Pressable
            accessibilityLabel={`Użyj ${biometric.label}`}
            accessibilityRole="button"
            disabled={isDisabled}
            onPress={biometric.onPress}
            style={({ pressed }) => [styles.key, styles.plainKey, pressed ? styles.pressed : null]}
          >
            <SymbolView
              name={{ ios: biometric.symbol, android: 'fingerprint', web: 'fingerprint' }}
              size={28}
              tintColor={overviewColors.textPrimary}
            />
          </Pressable>
        ) : (
          <View style={[styles.key, styles.plainKey]} />
        )}
        <Key disabled={isDisabled} label="0" onPress={() => press('0')} />
        <Pressable
          accessibilityLabel="Usuń ostatnią cyfrę"
          accessibilityRole="button"
          disabled={isDisabled || value.length === 0}
          onPress={erase}
          style={({ pressed }) => [styles.key, styles.plainKey, pressed ? styles.pressed : null]}
        >
          <SymbolView
            name={{ ios: 'delete.left', android: 'backspace', web: 'backspace' }}
            size={24}
            tintColor={overviewColors.textPrimary}
          />
        </Pressable>
      </View>
    </View>
  );
}

function Key({ label, onPress, disabled }: { label: string; onPress: () => void; disabled: boolean }) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="keyboardkey"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.key,
        disabled ? styles.disabled : null,
        pressed ? styles.pressed : null,
      ]}
    >
      <Text maxFontSizeMultiplier={1.3} style={styles.keyLabel}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 18,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: overviewColors.textSecondary,
  },
  dotFilled: {
    borderColor: overviewColors.textPrimary,
    backgroundColor: overviewColors.textPrimary,
  },
  dotError: {
    borderColor: overviewColors.negative,
    backgroundColor: overviewColors.negative,
  },
  pad: {
    gap: 14,
    alignSelf: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: 22,
  },
  key: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: overviewColors.surfacePressed,
  },
  plainKey: {
    backgroundColor: 'transparent',
  },
  keyLabel: {
    fontSize: 30,
    fontWeight: '500',
    color: overviewColors.textPrimary,
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.55,
  },
});
