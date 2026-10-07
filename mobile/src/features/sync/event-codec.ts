import { eventChangeProblem } from '@bankstats/convex/convex/changeRules';
import type { EventContent } from '@bankstats/convex/convex/sync';

import type { SpendingEvent } from '@/features/events/spending-event';

import { withoutUndefined, type SyncCodec, type SyncedChange } from './sync-plan';

export type EventChange = EventContent;

export type RemoteEvent = SyncedChange<EventChange>;

export const eventCodec: SyncCodec<SpendingEvent, EventChange> = {
  includes: () => true,
  idOf: (event) => event.id,
  toChange: (event) =>
    withoutUndefined({
      clientId: event.id,
      name: event.name,
      startedAt: event.startedAt,
      endedAt: event.endedAt,
      color: event.color,
    }),
  fromChange: (change) =>
    withoutUndefined({
      id: change.clientId,
      name: change.name,
      startedAt: change.startedAt,
      endedAt: change.endedAt,
      color: change.color,
    }),
  isPushable: (change) => eventChangeProblem(change) === null,
};
