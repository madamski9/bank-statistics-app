import { useState } from 'react';

import { useCopy } from '@/features/app-shell/localization/language';
import { NamePrompt } from '@/features/app-shell/name-prompt/name-prompt';

import type { EventSummary } from '../event-summary';
import { eventsCopy } from '../events-copy';
import { eventNameError, type SpendingEvent } from '../spending-event';
import { RunningEventBanner } from './components/running-event-banner';
import { StartEventButton } from './components/start-event-button';

interface EventBannerProps {
  runningEvent: EventSummary | null;
  isEventFocused: boolean;
  canStartEvent: boolean;
  onRequirePremium: () => void;
  onToggleEventFocus: () => void;
  onStartEvent: (name: string) => Promise<SpendingEvent>;
  onOpenEvents: () => void;
}

export function EventBanner({
  runningEvent,
  isEventFocused,
  canStartEvent,
  onRequirePremium,
  onToggleEventFocus,
  onStartEvent,
  onOpenEvents,
}: EventBannerProps) {
  const copy = useCopy(eventsCopy);
  const [isPrompting, setIsPrompting] = useState(false);

  return (
    <>
      {runningEvent === null ? (
        <StartEventButton
          canStartEvent={canStartEvent}
          onRequirePremium={onRequirePremium}
          onStart={() => setIsPrompting(true)}
        />
      ) : (
        <RunningEventBanner
          isEventFocused={isEventFocused}
          onOpenEvents={onOpenEvents}
          onToggleEventFocus={onToggleEventFocus}
          runningEvent={runningEvent}
        />
      )}

      <NamePrompt
        cancelLabel={copy.cancel}
        confirmLabel={copy.start}
        message={copy.startMessage}
        onCancel={() => setIsPrompting(false)}
        onConfirm={async (name) => {
          await onStartEvent(name);
          setIsPrompting(false);
        }}
        placeholder={copy.namePlaceholder}
        title={copy.startTitle}
        validate={eventNameError}
        visible={isPrompting}
      />
    </>
  );
}
