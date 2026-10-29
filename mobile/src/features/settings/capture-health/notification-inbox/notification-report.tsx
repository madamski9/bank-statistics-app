import { api } from '@bankstats/convex/convex/_generated/api';
import type { NotificationDiagnostic } from '@bankstats/ingestion-native';
import {
  diagnosticSamplePreview,
  diagnosticSampleProblem,
  diagnosticSampleTextLimit,
  type DiagnosticNotification,
} from '@bankstats/parser-rules';
import { useConvex, useConvexAuth } from 'convex/react';
import { ConvexError } from 'convex/values';
import { useRef, useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { useCopy } from '@/features/app-shell/localization/language';
import { SheetButton } from '@/features/app-shell/sheet/components/sheet-button';
import { SheetRow } from '@/features/app-shell/sheet/components/sheet-row';
import { SheetLayout } from '@/features/app-shell/sheet/sheet-layout';

import { diagnosticDetails, diagnosticReason, redactedSample } from './diagnostic-model';
import { notificationInboxCopy } from './notification-inbox-copy';
import { inboxStyles } from './notification-inbox-styles';

interface NotificationReportProps {
  notification: NotificationDiagnostic;
  onBack: () => void;
}

export function NotificationReport({ notification, onBack }: NotificationReportProps) {
  const copy = useCopy(notificationInboxCopy);
  const convex = useConvex();
  const { isAuthenticated } = useConvexAuth();
  const [sample, setSample] = useState(() => redactedSample(notification));
  const [reviewed, setReviewed] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionKey] = useState(
    () => `sample-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
  );
  const revision = useRef(0);
  const requestId = useRef(`${sessionKey}-0`);
  const sendingRef = useRef(false);
  const problem = diagnosticSampleProblem(sample);
  const preview = diagnosticSamplePreview(sample);

  const update = (field: keyof DiagnosticNotification, value: string) => {
    if (sendingRef.current) return;
    setSample((current) => ({ ...current, [field]: value }));
    revision.current += 1;
    requestId.current = `${sessionKey}-${revision.current}`;
    setReviewed(false);
    setError(null);
  };

  const send = async () => {
    if (sendingRef.current || !reviewed || problem !== null || !isAuthenticated) return;
    if (!convex.connectionState().isWebSocketConnected) {
      setError(copy.offline);
      return;
    }
    sendingRef.current = true;
    setSending(true);
    setError(null);
    try {
      await convex.mutation(api.diagnosticSamples.submit, {
        clientId: requestId.current,
        notification: { ...sample },
        clientParserVersion:
          diagnosticDetails(notification).parser?.parserVersion ?? notification.rulesVersion ?? 0,
        reasonCode: diagnosticReason(notification),
        reviewed: true,
      });
      setSent(true);
    } catch (failure) {
      setError(
        failure instanceof ConvexError &&
          typeof failure.data === 'object' &&
          failure.data?.code === 'diagnosticDailyLimit'
          ? copy.dailyLimit
          : copy.reportFailed,
      );
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  return (
    <SheetLayout
      closeLabel={copy.back}
      onClose={() => {
        if (!sendingRef.current) onBack();
      }}
      title={copy.reportTitle}
      titleLines={2}
    >
      {sent ? (
        <>
          <Text accessibilityLiveRegion="polite" style={inboxStyles.status}>
            {copy.sent}
          </Text>
          <SheetButton label={copy.back} onPress={onBack} />
        </>
      ) : (
        <>
          <Text style={inboxStyles.note}>{copy.reportHelp}</Text>
          {(['title', 'subtitle', 'body'] as const).map((field) => (
            <View key={field} style={inboxStyles.block}>
              <Text style={inboxStyles.label}>
                {field === 'title'
                  ? copy.notificationTitle
                  : field === 'subtitle'
                    ? copy.subtitle
                    : copy.body}
              </Text>
              <TextInput
                accessibilityLabel={
                  field === 'title'
                    ? copy.notificationTitle
                    : field === 'subtitle'
                      ? copy.subtitle
                      : copy.body
                }
                autoCapitalize="none"
                autoCorrect={false}
                editable={!sending}
                maxLength={diagnosticSampleTextLimit}
                multiline
                onChangeText={(value) => update(field, value)}
                spellCheck={false}
                style={[inboxStyles.input, field === 'body' ? inboxStyles.bodyInput : null]}
                value={sample[field]}
              />
            </View>
          ))}
          <SheetButton
            label={showPreview ? copy.hidePreview : copy.preview}
            onPress={() => setShowPreview((value) => !value)}
          />
          {showPreview ? (
            <Text selectable style={inboxStyles.json}>
              {JSON.stringify({ notification: sample, ...preview }, null, 2)}
            </Text>
          ) : null}
          <Text style={inboxStyles.note}>{copy.reportRetention}</Text>
          <SheetRow
            isFirst
            isSelected={reviewed}
            label={copy.consent}
            labelLines={0}
            onPress={() => {
              if (!sending) setReviewed((value) => !value);
            }}
          />
          {problem !== null ? (
            <Text style={inboxStyles.error}>{copy.problems[problem]}</Text>
          ) : null}
          {!isAuthenticated ? <Text style={inboxStyles.note}>{copy.signIn}</Text> : null}
          {error !== null ? (
            <Text accessibilityLiveRegion="polite" style={inboxStyles.error}>
              {error}
            </Text>
          ) : null}
          <SheetButton
            disabled={sending || !reviewed || problem !== null || !isAuthenticated}
            label={sending ? copy.sending : copy.send}
            onPress={() => void send()}
            tone="primary"
          />
        </>
      )}
    </SheetLayout>
  );
}
