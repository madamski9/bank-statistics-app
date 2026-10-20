import { useState } from 'react';
import type { IngestionRecord } from '@bankstats/ingestion-native';
import * as Linking from 'expo-linking';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { SheetButton } from '@/features/app-shell/sheet/components/sheet-button';
import { SheetRow } from '@/features/app-shell/sheet/components/sheet-row';
import { SheetSection } from '@/features/app-shell/sheet/components/sheet-section';
import { SheetLayout } from '@/features/app-shell/sheet/sheet-layout';
import { useCopy } from '@/features/app-shell/localization/language';
import { shortcutUrlFor } from '@/features/onboarding/shortcut-setup/shortcut-links';
import { overviewColors } from '@/features/app-shell/theme/overview-theme';
import { formatDayHeading, formatTime } from '@/features/app-shell/formatting/format-date';

import type { CaptureState } from './capture-health';
import { captureHealthCopy } from './capture-health-copy';
import { useCaptureHealth } from './use-capture-health';
import {
  NotificationInboxScreen,
  type NotificationInboxScreenProps,
} from './notification-inbox/notification-inbox-screen';

interface CaptureHealthScreenProps extends Omit<NotificationInboxScreenProps, 'onBack'> {
  records: IngestionRecord[];
  onClose: () => void;
}

const stateTones = {
  working: 'positive',
  attention: 'caution',
  unverified: 'muted',
  unconfigured: 'muted',
} as const satisfies Record<CaptureState, 'positive' | 'caution' | 'muted'>;

function moment(value: string, now: Date): string {
  const date = new Date(value);

  return `${formatDayHeading(date, now)}, ${formatTime(date)}`;
}

export function CaptureHealthScreen({
  records,
  onClose,
  accounts,
  onCreateAccount,
  onRecordsChanged,
}: CaptureHealthScreenProps) {
  const copy = useCopy(captureHealthCopy);
  const [inboxOpen, setInboxOpen] = useState(false);
  const { health, selfTest, runSelfTest, refresh } = useCaptureHealth(records);
  const now = new Date();
  const failureLabel = (code: string | null) =>
    code === null
      ? copy.failureReasons.unknown
      : (copy.failureReasons[code as keyof typeof copy.failureReasons] ??
        copy.failureReasons.unknown);
  const { automation } = health;

  if (inboxOpen) {
    return (
      <NotificationInboxScreen
        accounts={accounts}
        onCreateAccount={onCreateAccount}
        onRecordsChanged={onRecordsChanged}
        onBack={() => {
          setInboxOpen(false);
          void refresh();
        }}
      />
    );
  }

  if (Platform.OS !== 'ios') {
    return (
      <SheetLayout closeLabel={copy.close} onClose={onClose} title={copy.title}>
        <Text maxFontSizeMultiplier={1.5} style={styles.note}>
          {copy.iosOnly}
        </Text>
      </SheetLayout>
    );
  }

  return (
    <SheetLayout closeLabel={copy.close} onClose={onClose} title={copy.title}>
      {health.banks.map((bank) => {
        const shortcutUrl = shortcutUrlFor([bank.bank]);

        return (
          <SheetSection
            footnote={bank.reason === null ? null : copy.reasons[bank.reason]}
            key={bank.bank}
            label={copy.banks[bank.bank]}
          >
            <SheetRow
              detail={
                bank.lastCaptureAt === null
                  ? copy.noCapture
                  : copy.lastCapture(moment(bank.lastCaptureAt, now))
              }
              isFirst
              label={copy.banks[bank.bank]}
              value={copy.states[bank.state]}
              valueTone={stateTones[bank.state]}
            />
            {bank.state !== 'working' && shortcutUrl !== null ? (
              <SheetRow
                label={
                  bank.state === 'unconfigured'
                    ? copy.setUp(copy.banks[bank.bank])
                    : copy.checkSetup(copy.banks[bank.bank])
                }
                onPress={() => void Linking.openURL(shortcutUrl)}
              />
            ) : null}
          </SheetSection>
        );
      })}

      <SheetSection label={copy.automation}>
        <SheetRow
          detail={
            automation.lastOutcome === null
              ? undefined
              : automation.lastOutcome === 'success'
                ? copy.outcomes.success
                : `${copy.outcomes[automation.lastOutcome]}: ${failureLabel(automation.lastReason)}`
          }
          isFirst
          label={copy.lastRun}
          value={automation.lastRunAt === null ? copy.never : moment(automation.lastRunAt, now)}
          valueTone="muted"
        />
        <SheetRow
          detail={copy.pendingRetention}
          label={copy.pendingNotifications}
          onPress={() => setInboxOpen(true)}
          value={String(health.pendingNotificationCount)}
          valueTone="caution"
        />
        {automation.lastFailureAt !== null ? (
          <SheetRow
            detail={failureLabel(automation.lastFailureReason)}
            label={copy.lastFailure}
            value={moment(automation.lastFailureAt, now)}
            valueTone="caution"
          />
        ) : null}
      </SheetSection>

      <View style={styles.selfTest}>
        <SheetButton
          disabled={selfTest.state === 'running'}
          label={selfTest.state === 'running' ? copy.selfTestRunning : copy.selfTest}
          onPress={() => void runSelfTest()}
        />
        {selfTest.state === 'passed' ? (
          <Text accessibilityLiveRegion="polite" maxFontSizeMultiplier={1.5} style={styles.passed}>
            {copy.selfTestPassed}
          </Text>
        ) : selfTest.state === 'failed' ? (
          <Text accessibilityLiveRegion="polite" maxFontSizeMultiplier={1.5} style={styles.failed}>
            {copy.selfTestFailed(selfTest.reason)}
          </Text>
        ) : null}
      </View>

      <Text maxFontSizeMultiplier={1.5} style={styles.note}>
        {copy.footnote}
      </Text>
    </SheetLayout>
  );
}

const styles = StyleSheet.create({
  selfTest: {
    gap: 8,
  },
  passed: {
    fontSize: 13,
    lineHeight: 18,
    color: overviewColors.positive,
  },
  failed: {
    fontSize: 13,
    lineHeight: 18,
    color: overviewColors.negative,
  },
  note: {
    fontSize: 13,
    lineHeight: 18,
    color: overviewColors.textSecondary,
  },
});
