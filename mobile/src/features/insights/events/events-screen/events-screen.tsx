import { useAndroidBack } from '@/features/app-shell/sheet/sheet-modal';
import type { IngestionRecord } from '@bankstats/ingestion-native';
import { useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { useCopy } from '@/features/app-shell/localization/language';
import { NamePrompt } from '@/features/app-shell/name-prompt/name-prompt';
import { SheetButton } from '@/features/app-shell/sheet/components/sheet-button';
import { SheetLayout } from '@/features/app-shell/sheet/sheet-layout';
import type { CategorizationRule } from '@/features/data/classification/categorization-rule';

import { eventColorKey } from '../event-colors';
import { summarizeEvent } from '../event-summary';
import { eventsCopy } from '../events-copy';
import { eventNameError, isActive, sortedEvents, type SpendingEvent } from '../spending-event';
import { BackChevron } from './components/back-chevron';
import { EventBreakdown } from './components/event-breakdown';
import { EventColorPicker } from './components/event-color-picker';
import { EventHero } from './components/event-hero';
import { EventList } from './components/event-list';

interface EventsScreenProps {
  events: SpendingEvent[];
  records: IngestionRecord[];
  rules: CategorizationRule[];
  initialEventId?: string | null;
  showsHistory: boolean;
  onSave: (event: SpendingEvent) => Promise<void>;
  onEnd: (event: SpendingEvent) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
}

export function EventsScreen({
  events,
  records,
  rules,
  initialEventId = null,
  showsHistory,
  onSave,
  onEnd,
  onDelete,
  onClose,
}: EventsScreenProps) {
  const copy = useCopy(eventsCopy);
  const [selectedId, setSelectedId] = useState<string | null>(initialEventId);
  const [isRenaming, setIsRenaming] = useState(false);
  const now = useMemo(() => new Date(), []);
  const ordered = useMemo(
    () => sortedEvents(showsHistory ? events.filter((event) => event.endedAt !== undefined) : events),
    [events, showsHistory],
  );
  const selected = events.find((event) => event.id === selectedId) ?? null;
  const summaries = useMemo(
    () => new Map(ordered.map((event) => [event.id, summarizeEvent(records, event, events, rules, now)])),
    [events, now, ordered, records, rules],
  );
  const summary = selected === null ? null : (summaries.get(selected.id) ?? null);

  useAndroidBack(() => setSelectedId(null), selected !== null && showsHistory);

  const confirmDelete = (event: SpendingEvent) => {
    Alert.alert(copy.deleteTitle, copy.deleteBody, [
      { style: 'cancel', text: copy.cancel },
      {
        style: 'destructive',
        text: copy.deleteConfirm,
        onPress: () => {
          void onDelete(event.id).then(() => (showsHistory ? setSelectedId(null) : onClose()));
        },
      },
    ]);
  };

  return (
    <SheetLayout
      closeLabel={copy.close}
      leading={
        selected === null || !showsHistory ? undefined : (
          <BackChevron label={copy.back} onPress={() => setSelectedId(null)} />
        )
      }
      onClose={onClose}
      title={selected?.name ?? copy.historyTitle}
    >
      {selected === null || summary === null ? (
        <EventList events={ordered} now={now} onSelect={setSelectedId} summaries={summaries} />
      ) : (
        <>
          <EventHero event={selected} now={now} summary={summary} />

          {isActive(selected) ? (
            <EventColorPicker
              onSelect={(color) => void onSave({ ...selected, color })}
              selected={eventColorKey(selected)}
            />
          ) : null}

          <EventBreakdown now={now} rules={rules} summary={summary} />

          <View style={styles.actions}>
            {isActive(selected) ? (
              <SheetButton label={copy.end} onPress={() => void onEnd(selected)} tone="primary" />
            ) : null}
            <SheetButton label={copy.rename} onPress={() => setIsRenaming(true)} />
            <SheetButton label={copy.delete} onPress={() => confirmDelete(selected)} tone="danger" />
          </View>
        </>
      )}

      <NamePrompt
        cancelLabel={copy.cancel}
        confirmLabel={copy.save}
        initialValue={selected?.name ?? ''}
        onCancel={() => setIsRenaming(false)}
        onConfirm={async (name) => {
          if (selected !== null) {
            await onSave({ ...selected, name });
          }

          setIsRenaming(false);
        }}
        placeholder={copy.namePlaceholder}
        title={copy.renameTitle}
        validate={eventNameError}
        visible={isRenaming}
      />
    </SheetLayout>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: 10,
  },
});
