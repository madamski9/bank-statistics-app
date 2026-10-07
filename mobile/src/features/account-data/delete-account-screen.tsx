import { api } from '@bankstats/convex/convex/_generated/api';
import { isIdentityCheckRequired } from '@bankstats/convex/convex/owner';
import { useAuth } from '@clerk/expo';
import { useAction, useMutation } from 'convex/react';
import { ConvexError } from 'convex/values';
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

interface DeletionProgress {
  isComplete: boolean;
}

function isStaleVerification(error: unknown): boolean {
  return error instanceof ConvexError && isIdentityCheckRequired(error.data);
}

export function DeleteAccountScreen({ onCancel }: DeleteAccountScreenProps) {
  const insets = useSafeAreaInsets();
  const copy = useCopy(accountDataCopy);
  const startDeletion = useAction(api.account.startDeletion);
  const deleteData = useMutation(api.account.deleteData);
  const { getToken } = useAuth();
  const [step, setStep] = useState<Step>('explain');

  const runDeletion = useCallback(
    async (begin: () => Promise<DeletionProgress>) => {
      setStep('deleting');

      try {
        let progress = await begin();

        for (let round = 1; !progress.isComplete && round < maximumDeletionRounds; round += 1) {
          progress = await deleteData({});
        }

        if (!progress.isComplete) {
          setStep('failed');
        }
      } catch (error) {
        setStep(isStaleVerification(error) ? 'verify' : 'failed');
      }
    },
    [deleteData],
  );

  const deleteAfterVerification = useCallback(() => {
    void runDeletion(async () => {
      const sessionToken = await getToken({ skipCache: true });

      if (sessionToken === null) {
        throw new Error('The session token is unavailable.');
      }

      return startDeletion({ sessionToken });
    });
  }, [getToken, runDeletion, startDeletion]);

  const retryDeletion = useCallback(() => {
    void runDeletion(() => deleteData({}));
  }, [deleteData, runDeletion]);

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
          <EmailReverification onVerified={deleteAfterVerification} />
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
            onPress={retryDeletion}
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
