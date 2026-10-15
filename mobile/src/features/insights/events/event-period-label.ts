import { formatDayHeading } from '@/features/app-shell/formatting/format-date';

import type { eventsCopy } from './events-copy';
import type { SpendingEvent } from './spending-event';

export function eventPeriodLabel(event: SpendingEvent, now: Date, copy: (typeof eventsCopy)['pl']): string {
  const from = formatDayHeading(new Date(event.startedAt), now);

  return event.endedAt === undefined
    ? copy.ongoing(from)
    : copy.range(from, formatDayHeading(new Date(event.endedAt), now));
}
