import { api } from '@bankstats/convex/convex/_generated/api';
import { useClerk, useUser } from '@clerk/expo';
import { useConvexAuth, useQuery } from 'convex/react';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { overviewColors, overviewSpacing } from '@/features/app-shell/theme/overview-theme';
import { clearLocalData } from '@/features/data/sync/cloud-sync/clear-local-data';
import { forgetInstallationId } from '@/features/data/sync/device-ownership/installation-id';
import { useInstallationId } from '@/features/data/sync/device-ownership/use-installation-id';
import { useCopy } from '@/features/app-shell/localization/language';

import { accountDataCopy } from '../account-data-copy';
import { AppleDisconnectNotice } from '../delete-account/components/apple-disconnect-notice';
import { EmailReverification } from './email-reverification';

interface AccountStandingGateProps {
  children: ReactNode;
}

export function AccountStandingGate({ children }: AccountStandingGateProps) {
  const { isAuthenticated } = useConvexAuth();
  const installationId = useInstallationId();
  const standing = useQuery(
    api.devices.standing,
    isAuthenticated && installationId !== null ? { installationId } : 'skip',
  );

  if (standing === 'revoked') {
    return <RevokedDeviceScreen />;
  }

  if (standing === 'accountDeleted') {
    return <FinishDeletionScreen />;
  }

  return children;
}

type Cleanup = 'working' | 'done' | 'failed';

function useLocalCleanup(extra: () => Promise<void>) {
  const [cleanup, setCleanup] = useState<Cleanup>('working');
  const hasStarted = useRef(false);

  const run = useCallback(async () => {
    setCleanup('working');

    try {
      await clearLocalData();
      await extra();
      setCleanup('done');
    } catch {
      setCleanup('failed');
    }
  }, [extra]);

  useEffect(() => {
    if (hasStarted.current) {
      return;
    }

    hasStarted.current = true;
    void run();
  }, [run]);

  return { cleanup, retry: run };
}

function RevokedDeviceScreen() {
  const { signOut } = useClerk();
  const { cleanup, retry } = useLocalCleanup(forgetInstallationId);
  const copy = useCopy(accountDataCopy);

  return (
    <StandingLayout
      body={copy.revokedBody}
      title={copy.revokedTitle}
    >
      {cleanup === 'working' ? <ActivityIndicator color={overviewColors.textPrimary} /> : null}
      {cleanup === 'failed' ? (
        <ActionButton label={copy.retryCleanup} onPress={() => void retry()} />
      ) : null}
      {cleanup === 'done' ? <ActionButton label={copy.signOut} onPress={() => void signOut()} /> : null}
    </StandingLayout>
  );
}

const noExtraCleanup = async () => undefined;

function FinishDeletionScreen() {
  const { user } = useUser();
  const { cleanup, retry } = useLocalCleanup(noExtraCleanup);
  const copy = useCopy(accountDataCopy);
  const [identity, setIdentity] = useState<'deleting' | 'needsVerification' | 'failed'>('deleting');
  const hasTriedDeletion = useRef(false);

  const deleteIdentity = useCallback(async () => {
    if (user == null) {
      return;
    }

    setIdentity('deleting');

    try {
      await user.delete();
      await forgetInstallationId().catch(() => undefined);
    } catch {
      setIdentity('needsVerification');
    }
  }, [user]);

  useEffect(() => {
    if (cleanup !== 'done' || hasTriedDeletion.current) {
      return;
    }

    hasTriedDeletion.current = true;
    void deleteIdentity();
  }, [cleanup, deleteIdentity]);

  return (
    <StandingLayout
      body={copy.deletionBody}
      title={copy.deletionTitle}
    >
      <AppleDisconnectNotice />
      {cleanup === 'failed' ? (
        <ActionButton label={copy.retry} onPress={() => void retry()} />
      ) : identity === 'needsVerification' ? (
        <EmailReverification onVerified={() => void deleteIdentity()} />
      ) : (
        <ActivityIndicator color={overviewColors.textPrimary} />
      )}
    </StandingLayout>
  );
}

function StandingLayout({ title, body, children }: { title: string; body: string; children: ReactNode }) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.screen,
        { paddingTop: insets.top + 48, paddingBottom: insets.bottom + overviewSpacing.block },
      ]}
    >
      <View style={styles.copy}>
        <Text accessibilityRole="header" maxFontSizeMultiplier={1.35} style={styles.title}>
          {title}
        </Text>
        <Text accessibilityLiveRegion="polite" maxFontSizeMultiplier={1.5} style={styles.body}>
          {body}
        </Text>
      </View>
      <View style={styles.actions}>{children}</View>
    </View>
  );
}

function ActionButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.primary, pressed ? styles.pressed : null]}
    >
      <Text maxFontSizeMultiplier={1.4} style={styles.primaryLabel}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: overviewSpacing.gutter,
    backgroundColor: overviewColors.background,
  },
  copy: {
    gap: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: overviewColors.textPrimary,
  },
  body: {
    fontSize: 16,
    lineHeight: 23,
    color: overviewColors.textSecondary,
  },
  actions: {
    gap: 12,
  },
  primary: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: overviewColors.surfacePressed,
  },
  primaryLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: overviewColors.textPrimary,
  },
  pressed: {
    opacity: 0.6,
  },
});
