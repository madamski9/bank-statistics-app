import { useCopy } from '@/features/app-shell/localization/language';
import { eventsCopy } from '@/features/insights/events/events-copy';
import { noEventId, sortedEvents, type SpendingEvent } from '@/features/insights/events/spending-event';
import { selectionChanged } from '@/haptics';

import { ChoiceChip, ChoiceGroup } from './choice-chip';

const maximumEventChips = 6;

interface EventPickerProps {
  events: SpendingEvent[];
  eventId: string;
  onSelect: (eventId: string) => void;
}

export function EventPicker({ events, eventId, onSelect }: EventPickerProps) {
  const copy = useCopy(eventsCopy);
  const options = [
    { id: '', label: copy.automatic },
    { id: noEventId, label: copy.none },
    ...sortedEvents(events)
      .slice(0, maximumEventChips)
      .map((event) => ({ id: event.id, label: event.name })),
  ];

  return (
    <ChoiceGroup label={copy.eventLabel}>
      {options.map((option) => (
        <ChoiceChip
          isActive={option.id === eventId}
          key={option.id === '' ? 'automatic' : option.id}
          label={option.label}
          numberOfLines={1}
          onPress={() => {
            selectionChanged();
            onSelect(option.id);
          }}
        />
      ))}
    </ChoiceGroup>
  );
}
