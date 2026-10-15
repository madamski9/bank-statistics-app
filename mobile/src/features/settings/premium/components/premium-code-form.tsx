import { api } from '@bankstats/convex/convex/_generated/api';
import { isPremiumAlreadyPermanent, isPremiumCodeInvalid } from '@bankstats/convex/convex/premiumCodeErrors';
import { useMutation } from 'convex/react';
import { ConvexError } from 'convex/values';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useCopy } from '@/features/app-shell/localization/language';
import { overviewColors } from '@/features/app-shell/theme/overview-theme';

import { premiumCopy } from '../premium-copy';

export function PremiumCodeForm() {
  const copy = useCopy(premiumCopy);
  const redeem = useMutation(api.premiumCodes.redeem);
  const [isOpen, setIsOpen] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const canSubmit = !isRedeeming && code.trim() !== '';

  const submit = useCallback(async () => {
    if (!canSubmit) {
      return;
    }

    setError(null);
    setIsRedeeming(true);

    try {
      await redeem({ code });
    } catch (failure) {
      const data = failure instanceof ConvexError ? failure.data : null;
      setError(
        isPremiumCodeInvalid(data)
          ? copy.codeInvalid
          : isPremiumAlreadyPermanent(data)
            ? copy.codeAlreadyPermanent
            : copy.codeFailed,
      );
      setIsRedeeming(false);
    }
  }, [canSubmit, code, copy, redeem]);

  if (!isOpen) {
    return (
      <Pressable
        accessibilityRole="button"
        hitSlop={8}
        onPress={() => setIsOpen(true)}
        style={({ pressed }) => [styles.toggle, pressed ? styles.pressed : null]}
      >
        <Text maxFontSizeMultiplier={1.4} style={styles.toggleLabel}>
          {copy.haveCode}
        </Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.form}>
      <TextInput
        accessibilityLabel={copy.codeLabel}
        autoCapitalize="characters"
        autoComplete="off"
        autoCorrect={false}
        autoFocus
        editable={!isRedeeming}
        maxLength={16}
        onChangeText={setCode}
        onSubmitEditing={() => void submit()}
        placeholder={copy.codePlaceholder}
        placeholderTextColor={overviewColors.textDisabled}
        returnKeyType="done"
        style={styles.input}
        value={code}
      />
      {error !== null ? (
        <Text accessibilityLiveRegion="polite" maxFontSizeMultiplier={1.5} style={styles.error}>
          {error}
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        disabled={!canSubmit}
        onPress={() => void submit()}
        style={({ pressed }) => [styles.submit, canSubmit ? null : styles.disabled, pressed ? styles.pressed : null]}
      >
        {isRedeeming ? (
          <ActivityIndicator color={overviewColors.background} />
        ) : (
          <Text maxFontSizeMultiplier={1.4} style={styles.submitLabel}>
            {copy.useCode}
          </Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  toggle: {
    alignSelf: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: overviewColors.textSecondary,
  },
  form: {
    gap: 12,
  },
  input: {
    minHeight: 52,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: overviewColors.hairline,
    backgroundColor: overviewColors.surface,
    fontSize: 18,
    letterSpacing: 2,
    color: overviewColors.textPrimary,
  },
  error: {
    fontSize: 14,
    lineHeight: 20,
    color: overviewColors.negative,
  },
  submit: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: overviewColors.textPrimary,
  },
  submitLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: overviewColors.background,
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.7,
  },
});
