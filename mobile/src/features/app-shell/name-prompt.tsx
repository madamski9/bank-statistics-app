import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { overviewColors, overviewSpacing } from '@/features/spending-overview/overview-theme';
import { PrivacyShield } from '@/features/privacy/privacy-shield';

interface NamePromptProps {
  visible: boolean;
  title: string;
  message?: string;
  placeholder: string;
  initialValue?: string;
  confirmLabel: string;
  cancelLabel: string;
  validate: (name: string) => string | null;
  onConfirm: (name: string) => Promise<void>;
  onCancel: () => void;
}

export function NamePrompt({ visible, onCancel, ...rest }: NamePromptProps) {
  return (
    <Modal animationType="fade" onRequestClose={onCancel} transparent visible={visible}>
      {visible ? (
        <>
          <NamePromptCard onCancel={onCancel} {...rest} />
          <PrivacyShield />
        </>
      ) : null}
    </Modal>
  );
}

function NamePromptCard({
  title,
  message,
  placeholder,
  initialValue = '',
  confirmLabel,
  cancelLabel,
  validate,
  onConfirm,
  onCancel,
}: Omit<NamePromptProps, 'visible'>) {
  const [name, setName] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const confirm = async () => {
    const invalid = validate(name);

    if (invalid !== null) {
      setError(invalid);
      return;
    }

    setIsSaving(true);

    try {
      await onConfirm(name.trim());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
      <View style={styles.card}>
        <Text accessibilityRole="header" maxFontSizeMultiplier={1.4} style={styles.title}>
          {title}
        </Text>
        {message !== undefined ? (
          <Text maxFontSizeMultiplier={1.5} style={styles.message}>
            {message}
          </Text>
        ) : null}
        <TextInput
          accessibilityLabel={title}
          autoFocus
          onChangeText={(value) => {
            setError(null);
            setName(value);
          }}
          onSubmitEditing={() => void confirm()}
          placeholder={placeholder}
          placeholderTextColor={overviewColors.textDisabled}
          returnKeyType="done"
          selectionColor={overviewColors.textPrimary}
          style={styles.input}
          value={name}
        />
        {error !== null ? (
          <Text accessibilityLiveRegion="polite" maxFontSizeMultiplier={1.5} style={styles.error}>
            {error}
          </Text>
        ) : null}
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={onCancel}
            style={({ pressed }) => [styles.action, pressed ? styles.pressed : null]}
          >
            <Text maxFontSizeMultiplier={1.4} style={styles.cancelLabel}>
              {cancelLabel}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={isSaving}
            onPress={() => void confirm()}
            style={({ pressed }) => [styles.action, styles.confirm, pressed ? styles.pressed : null]}
          >
            {isSaving ? (
              <ActivityIndicator color={overviewColors.background} />
            ) : (
              <Text
                adjustsFontSizeToFit
                maxFontSizeMultiplier={1.4}
                minimumFontScale={0.8}
                numberOfLines={1}
                style={styles.confirmLabel}
              >
                {confirmLabel}
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: overviewSpacing.gutter,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
  },
  card: {
    gap: overviewSpacing.row,
    padding: overviewSpacing.gutter,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: overviewColors.hairline,
    backgroundColor: overviewColors.surface,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: overviewColors.textPrimary,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    color: overviewColors.textSecondary,
  },
  input: {
    minHeight: 50,
    paddingHorizontal: 14,
    borderRadius: 14,
    fontSize: 17,
    color: overviewColors.textPrimary,
    backgroundColor: overviewColors.surfacePressed,
  },
  error: {
    fontSize: 13,
    color: overviewColors.negative,
  },
  actions: {
    flexDirection: 'row',
    gap: overviewSpacing.tight,
  },
  action: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: overviewColors.surfacePressed,
  },
  confirm: {
    backgroundColor: overviewColors.textPrimary,
  },
  cancelLabel: {
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '600',
    color: overviewColors.textPrimary,
  },
  confirmLabel: {
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
    color: overviewColors.background,
  },
  pressed: {
    opacity: 0.6,
  },
});
