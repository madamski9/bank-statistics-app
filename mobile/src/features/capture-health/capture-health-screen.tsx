import type { IngestionRecord } from '@bankstats/ingestion-native';
import * as Linking from 'expo-linking';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { SheetButton, SheetLayout, SheetRow, SheetSection } from '@/features/sheets/sheet-layout';
import { useCopy } from '@/features/localization/language';
import { shortcutUrlFor } from '@/features/onboarding/shortcut-links';
import { overviewColors } from '@/features/spending-overview/overview-theme';
import { formatDayHeading, formatTime } from '@/features/transactions/format-date';

import type { CaptureState } from './capture-health';
import { captureHealthCopy } from './capture-health-copy';
import { useCaptureHealth } from './use-capture-health';

interface CaptureHealthScreenProps {
  records: IngestionRecord[];
  onClose: () => void;
}

const stateTones = {
  working: 'positive',
  attention: 'caution',
  unconfigured: 'muted',
} as const satisfies Record<CaptureState, 'positive' | 'caution' | 'muted'>;

function moment(value: string, now: Date): string {
  const date = new Date(value);

  return `${formatDayHeading(date, now)}, ${formatTime(date)}`;
}

export function CaptureHealthScreen({ records, onClose }: CaptureHealthScreenProps) {
  const copy = useCopy(captureHealthCopy);
  const { health, selfTest, runSelfTest } = useCaptureHealth(records);
  const now = new Date();
  const failureLabel = (code: string | null) =>
    code === null
      ? copy.failureReasons.unknown
      : (copy.failureReasons[code as keyof typeof copy.failureReasons] ?? copy.failureReasons.unknown);
  const { automation } = health;

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
      {health.banks.map((bank) => (
        <SheetSection
          footnote={bank.reason === null ? null : copy.reasons[bank.reason]}
          key={bank.bank}
          label={copy.banks[bank.bank]}
        >
          <SheetRow
            detail={
              bank.lastCaptureAt === null ? copy.noCapture : copy.lastCapture(moment(bank.lastCaptureAt, now))
            }
            isFirst
            label={copy.banks[bank.bank]}
            value={copy.states[bank.state]}
            valueTone={stateTones[bank.state]}
          />
          {bank.state !== 'working' ? (
            <SheetRow
              label={copy.setUp(copy.banks[bank.bank])}
              onPress={() => void Linking.openURL(shortcutUrlFor([bank.bank]))}
            />
          ) : null}
        </SheetSection>
      ))}

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
