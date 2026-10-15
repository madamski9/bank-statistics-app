import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCopy } from '@/features/app-shell/localization/language';
import { overviewColors, overviewSpacing } from '@/features/app-shell/theme/overview-theme';

import { accountDataCopy } from '../account-data-copy';
import { EmailReverification } from '../account-standing/email-reverification';
import { DangerButton } from './components/danger-button';
import { DeletionExplanation } from './components/deletion-explanation';
import { deletionStyles } from './components/deletion-styles';
import { useAccountDeletion } from './use-account-deletion';

interface DeleteAccountScreenProps {
  onCancel: () => void;
}

export function DeleteAccountScreen({ onCancel }: DeleteAccountScreenProps) {
  const insets = useSafeAreaInsets();
  const copy = useCopy(accountDataCopy);
  const { step, requestVerification, deleteAfterVerification, retryDeletion } = useAccountDeletion();

  return (
    <ScrollView
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 32 },
      ]}
      style={styles.screen}
    >
      <Pressable
        accessibilityRole="button"
        disabled={step === 'deleting'}
        hitSlop={8}
        onPress={onCancel}
        style={({ pressed }) => [styles.cancel, pressed ? styles.pressed : null]}
      >
        <Text maxFontSizeMultiplier={1.3} style={styles.cancelLabel}>
          {copy.cancel}
        </Text>
      </Pressable>

      <Text accessibilityRole="header" maxFontSizeMultiplier={1.35} style={styles.title}>
        {copy.deleteTitle}
      </Text>

      {step === 'explain' ? <DeletionExplanation onContinue={requestVerification} /> : null}

      {step === 'verify' ? (
        <View style={deletionStyles.block}>
          <Text maxFontSizeMultiplier={1.5} style={deletionStyles.body}>
            {copy.confirmIdentity}
          </Text>
          <EmailReverification onVerified={deleteAfterVerification} />
        </View>
      ) : null}

      {step === 'deleting' ? (
        <View style={styles.progress}>
          <ActivityIndicator color={overviewColors.textPrimary} />
          <Text accessibilityLiveRegion="polite" maxFontSizeMultiplier={1.5} style={deletionStyles.body}>
            {copy.deleting}
          </Text>
        </View>
      ) : null}

      {step === 'failed' ? (
        <View style={deletionStyles.block}>
          <Text accessibilityLiveRegion="polite" maxFontSizeMultiplier={1.5} style={styles.error}>
            {copy.deleteFailed}
          </Text>
          <DangerButton label={copy.retry} onPress={retryDeletion} />
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: overviewColors.background,
  },
  content: {
    gap: overviewSpacing.section,
    paddingHorizontal: overviewSpacing.gutter,
  },
  cancel: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
  },
  cancelLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: overviewColors.textSecondary,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: overviewColors.textPrimary,
  },
  progress: {
    alignItems: 'center',
    gap: overviewSpacing.block,
    paddingVertical: overviewSpacing.section,
  },
  error: {
    fontSize: 15,
    lineHeight: 21,
    color: overviewColors.negative,
  },
  pressed: {
    opacity: 0.6,
  },
});
