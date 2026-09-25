import { api } from '@bankstats/convex/convex/_generated/api';
import { useMutation } from 'convex/react';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { overviewColors, overviewSpacing } from '@/features/spending-overview/overview-theme';
import { useCopy } from '@/features/localization/language';

import { accountDataCopy } from './account-data-copy';
import { subscriptionManagementUrl } from './account-links';
import { EmailReverification } from './email-reverification';

interface DeleteAccountScreenProps {
  onCancel: () => void;
}

type Step = 'explain' | 'verify' | 'deleting' | 'failed';

const maximumDeletionRounds = 200;

export function DeleteAccountScreen({ onCancel }: DeleteAccountScreenProps) {
  const insets = useSafeAreaInsets();
  const copy = useCopy(accountDataCopy);
  const deleteData = useMutation(api.account.deleteData);
  const [step, setStep] = useState<Step>('explain');

  const deleteSynchronizedData = useCallback(async () => {
    setStep('deleting');

    try {
      for (let round = 0; round < maximumDeletionRounds; round += 1) {
        const { isComplete } = await deleteData({});

        if (isComplete) {
          return;
        }
      }

      setStep('failed');
    } catch {
      setStep('failed');
    }
  }, [deleteData]);

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

      {step === 'explain' ? (
        <View style={styles.block}>
          <Text maxFontSizeMultiplier={1.5} style={styles.body}>
            {copy.deleteBody}
          </Text>
          <Text maxFontSizeMultiplier={1.5} style={styles.body}>
            {copy.deleteExportHint}
          </Text>
          <View style={styles.notice}>
            <Text maxFontSizeMultiplier={1.4} style={styles.noticeTitle}>
              {copy.subscriptionTitle}
            </Text>
            <Text maxFontSizeMultiplier={1.5} style={styles.noticeBody}>
              {copy.subscriptionBody}
            </Text>
            <Pressable
              accessibilityRole="link"
              onPress={() => void Linking.openURL(subscriptionManagementUrl)}
              style={({ pressed }) => [styles.link, pressed ? styles.pressed : null]}
            >
              <Text maxFontSizeMultiplier={1.4} style={styles.linkLabel}>
                {copy.manageSubscriptions}
              </Text>
            </Pressable>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => setStep('verify')}
            style={({ pressed }) => [styles.danger, pressed ? styles.pressed : null]}
          >
            <Text maxFontSizeMultiplier={1.4} style={styles.dangerLabel}>
              {copy.continue}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {step === 'verify' ? (
        <View style={styles.block}>
          <Text maxFontSizeMultiplier={1.5} style={styles.body}>
            {copy.confirmIdentity}
          </Text>
          <EmailReverification onVerified={() => void deleteSynchronizedData()} />
        </View>
      ) : null}

      {step === 'deleting' ? (
        <View style={styles.progress}>
          <ActivityIndicator color={overviewColors.textPrimary} />
          <Text accessibilityLiveRegion="polite" maxFontSizeMultiplier={1.5} style={styles.body}>
            {copy.deleting}
          </Text>
        </View>
      ) : null}

      {step === 'failed' ? (
        <View style={styles.block}>
          <Text accessibilityLiveRegion="polite" maxFontSizeMultiplier={1.5} style={styles.error}>
            {copy.deleteFailed}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void deleteSynchronizedData()}
            style={({ pressed }) => [styles.danger, pressed ? styles.pressed : null]}
          >
            <Text maxFontSizeMultiplier={1.4} style={styles.dangerLabel}>
              {copy.retry}
            </Text>
          </Pressable>
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
  block: {
    gap: overviewSpacing.block,
  },
  body: {
    fontSize: 16,
    lineHeight: 23,
    color: overviewColors.textSecondary,
  },
  notice: {
    gap: 8,
    padding: overviewSpacing.block,
    borderRadius: 18,
    backgroundColor: overviewColors.surface,
  },
  noticeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: overviewColors.textPrimary,
  },
  noticeBody: {
    fontSize: 14,
    lineHeight: 20,
    color: overviewColors.textSecondary,
  },
  link: {
    minHeight: 44,
    justifyContent: 'center',
  },
  linkLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: overviewColors.positive,
  },
  danger: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: overviewColors.negative,
  },
  dangerLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: overviewColors.background,
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
