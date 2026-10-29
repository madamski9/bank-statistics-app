import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { overviewColors } from '@/features/app-shell/theme/overview-theme';
import { useCopy } from '@/features/app-shell/localization/language';

import { privacyCopy } from '../privacy-copy';
import { pinLength } from './pin';
import { PinDots, PinPad } from './pin-pad';

interface PinSetupProps {
  onComplete: (pin: string) => Promise<void>;
  isCompact?: boolean;
}

export function PinSetup({ onComplete, isCompact = false }: PinSetupProps) {
  const copy = useCopy(privacyCopy);
  const [firstPin, setFirstPin] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = useCallback(
    async (next: string) => {
      setHasError(false);
      setPin(next);

      if (next.length < pinLength) {
        return;
      }

      if (firstPin === null) {
        setFirstPin(next);
        setPin('');
        setMessage(null);
        return;
      }

      if (next !== firstPin) {
        setFirstPin(null);
        setPin('');
        setHasError(true);
        setMessage(copy.pinsDiffer);
        return;
      }

      setIsSaving(true);

      try {
        await onComplete(next);
      } catch {
        setFirstPin(null);
        setPin('');
        setHasError(true);
        setMessage(copy.pinSaveFailed);
      } finally {
        setIsSaving(false);
      }
    },
    [copy, firstPin, onComplete],
  );

  return (
    <View style={[styles.setup, isCompact ? styles.compactSetup : null]}>
      <Text accessibilityLiveRegion="polite" maxFontSizeMultiplier={1.4} style={styles.prompt}>
        {firstPin === null ? copy.newPin : copy.repeatPin}
      </Text>
      <PinDots filled={pin.length} hasError={hasError} />
      <Text accessibilityLiveRegion="polite" maxFontSizeMultiplier={1.5} style={styles.message}>
        {message ?? ' '}
      </Text>
      <PinPad
        isCompact={isCompact}
        isDisabled={isSaving}
        onChange={(next) => void handleChange(next)}
        value={pin}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  setup: {
    gap: 18,
  },
  compactSetup: {
    gap: 12,
  },
  prompt: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    color: overviewColors.textPrimary,
  },
  message: {
    minHeight: 20,
    fontSize: 14,
    textAlign: 'center',
    color: overviewColors.negative,
  },
});
