import {
  listNotificationDiagnostics,
  restoreNotification,
  retryNotification,
  supportsNotificationDiagnostics,
  type IngestionRecord,
  type NotificationDiagnostic,
} from '@bankstats/ingestion-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Text, View } from 'react-native';

import { useCopy } from '@/features/app-shell/localization/language';
import { SheetButton } from '@/features/app-shell/sheet/components/sheet-button';
import { SheetRow } from '@/features/app-shell/sheet/components/sheet-row';
import { SheetSection } from '@/features/app-shell/sheet/components/sheet-section';
import { SheetLayout } from '@/features/app-shell/sheet/sheet-layout';
import type { FinancialAccount } from '@/features/data/financial-accounts/financial-account';
import { TransactionEditor } from '@/features/home/transactions/transaction-editor/transaction-editor';

import { diagnosticJson, diagnosticReason, recoveryDraft } from './diagnostic-model';
import { notificationInboxCopy } from './notification-inbox-copy';
import { inboxStyles } from './notification-inbox-styles';
import { NotificationReport } from './notification-report';

export interface NotificationInboxScreenProps {
  accounts: FinancialAccount[];
  onCreateAccount: (name: string) => Promise<FinancialAccount>;
  onRecordsChanged: () => Promise<void>;
  onBack: () => void;
}

export function NotificationInboxScreen({
  accounts,
  onCreateAccount,
  onRecordsChanged,
  onBack,
}: NotificationInboxScreenProps) {
  const copy = useCopy(notificationInboxCopy);
  const [entries, setEntries] = useState<NotificationDiagnostic[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<'detail' | 'restore' | 'report'>('detail');
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showTechnical, setShowTechnical] = useState(false);
  const busyRef = useRef(false);
  const activeRef = useRef(true);
  const selected = entries.find((entry) => entry.id === selectedId) ?? null;
  const supported = supportsNotificationDiagnostics();

  const load = useCallback(
    async (offset = 0) => {
      if (!supported) return;
      try {
        const next = await listNotificationDiagnostics(offset);
        if (!activeRef.current) return;
        setEntries((current) => (offset === 0 ? next : [...current, ...next]));
        setHasMore(next.length === 50);
        setError(null);
      } catch {
        if (activeRef.current) setError(copy.failed);
      } finally {
        if (activeRef.current) setLoading(false);
      }
    },
    [copy.failed, supported],
  );

  useEffect(() => {
    activeRef.current = true;
    if (supported) {
      void listNotificationDiagnostics()
        .then((next) => {
          if (!activeRef.current) return;
          setEntries(next);
          setHasMore(next.length === 50);
          setError(null);
          setLoading(false);
        })
        .catch(() => {
          if (!activeRef.current) return;
          setError(copy.failed);
          setLoading(false);
        });
    }
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && !busyRef.current) {
        setLoading(true);
        void load();
      }
    });
    return () => {
      activeRef.current = false;
      subscription.remove();
    };
  }, [copy.failed, load, supported]);

  const act = async (action: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await action();
    } catch {
      if (activeRef.current) setError(copy.failed);
    } finally {
      busyRef.current = false;
      if (activeRef.current) setBusy(false);
    }
  };

  const retry = async () => {
    if (selected === null) return;
    const result = await retryNotification(selected.id);
    await onRecordsChanged();
    await load();
    if (!activeRef.current) return;
    if (result.status !== 'pending') {
      setSelectedId(null);
      setMessage(result.status === 'saved' ? copy.saved : null);
    } else {
      setMessage(copy.stillPending);
    }
  };

  const restore = async (record: IngestionRecord) => {
    if (selected === null) return;
    await restoreNotification(selected.id, record);
    await onRecordsChanged();
    await load();
    if (!activeRef.current) return;
    setSelectedId(null);
    setMode('detail');
    setMessage(copy.saved);
  };

  if (selected !== null && mode === 'report') {
    return (
      <NotificationReport
        key={selected.id}
        notification={selected}
        onBack={() => setMode('detail')}
      />
    );
  }
  if (selected !== null && mode === 'restore') {
    return (
      <TransactionEditor
        accounts={accounts}
        initialDraft={recoveryDraft(selected)}
        isWriting={busy}
        key={selected.id}
        onCancel={() => {
          if (!busyRef.current) setMode('detail');
        }}
        onCreateAccount={onCreateAccount}
        onSubmit={(record) => void act(() => restore(record))}
        record={null}
        writeError={error}
      />
    );
  }

  const reason = selected === null ? null : diagnosticReason(selected);
  const reasonLabel = (code: string) =>
    copy.reasons[code as keyof typeof copy.reasons] ?? copy.reasons.unknown;
  return (
    <SheetLayout
      closeLabel={copy.back}
      onClose={() => {
        if (busyRef.current) return;
        if (selected !== null) {
          setSelectedId(null);
          setShowTechnical(false);
          setError(null);
          setMessage(null);
        } else onBack();
      }}
      title={copy.title}
      titleLines={2}
    >
      {!supported ? (
        <Text style={inboxStyles.note}>{copy.unavailable}</Text>
      ) : selected !== null ? (
        <>
          <View style={inboxStyles.card}>
            <Text style={inboxStyles.label}>{new Date(selected.capturedAt).toLocaleString()}</Text>
            {selected.title !== '' ? (
              <Text selectable style={inboxStyles.text}>
                {selected.title}
              </Text>
            ) : null}
            {selected.subtitle !== '' ? (
              <Text selectable style={inboxStyles.text}>
                {selected.subtitle}
              </Text>
            ) : null}
            <Text selectable style={inboxStyles.text}>
              {selected.body}
            </Text>
          </View>
          {reason !== null ? <Text style={inboxStyles.note}>{reasonLabel(reason)}</Text> : null}
          <SheetButton disabled={busy} label={copy.retry} onPress={() => void act(retry)} />
          <SheetButton
            disabled={busy}
            label={copy.restore}
            onPress={() => setMode('restore')}
            tone="primary"
          />
          <SheetButton disabled={busy} label={copy.report} onPress={() => setMode('report')} />
          <SheetButton
            label={showTechnical ? copy.hideTechnical : copy.technical}
            onPress={() => setShowTechnical((value) => !value)}
          />
          {showTechnical ? (
            <Text selectable style={inboxStyles.json}>
              {diagnosticJson(selected)}
            </Text>
          ) : null}
        </>
      ) : (
        <>
          <Text style={inboxStyles.note}>{copy.retention}</Text>
          <SheetSection label={copy.notification}>
            {entries.map((entry, index) => (
              <SheetRow
                detail={reasonLabel(diagnosticReason(entry))}
                isFirst={index === 0}
                key={entry.id}
                label={entry.title || entry.subtitle || copy.untitled}
                onPress={() => {
                  setSelectedId(entry.id);
                  setMode('detail');
                  setShowTechnical(false);
                  setError(null);
                  setMessage(null);
                }}
                value={new Date(entry.capturedAt).toLocaleDateString()}
                valueTone="muted"
              />
            ))}
          </SheetSection>
          {!loading && entries.length === 0 ? (
            <Text style={inboxStyles.note}>{copy.empty}</Text>
          ) : null}
          <SheetButton
            disabled={loading}
            label={loading ? copy.loading : copy.refresh}
            onPress={() => {
              setLoading(true);
              void load();
            }}
          />
          {hasMore ? (
            <SheetButton
              disabled={loading}
              label={copy.more}
              onPress={() => {
                setLoading(true);
                void load(entries.length);
              }}
            />
          ) : null}
        </>
      )}
      {error !== null ? (
        <Text accessibilityLiveRegion="polite" style={inboxStyles.error}>
          {error}
        </Text>
      ) : null}
      {message !== null ? (
        <Text accessibilityLiveRegion="polite" style={inboxStyles.status}>
          {message}
        </Text>
      ) : null}
    </SheetLayout>
  );
}
