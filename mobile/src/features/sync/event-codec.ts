import type { api } from '@bankstats/convex/convex/_generated/api';
import type { FunctionArgs, FunctionReturnType } from 'convex/server';

import type { SpendingEvent } from '@/features/events/spending-event';

import { withoutUndefined, type SyncCodec } from './sync-plan';

export type PushedEvent = FunctionArgs<typeof api.events.push>['changes'][number];

export type EventChange = Omit<PushedEvent, 'revision' | 'deleted'>;

export type RemoteEvent = FunctionReturnType<typeof api.events.list>[number];

export const eventCodec: SyncCodec<SpendingEvent, EventChange> = {
  includes: () => true,
  idOf: (event) => event.id,
  toChange: (event) =>
    withoutUndefined({
      clientId: event.id,
      name: event.name,
      startedAt: event.startedAt,
      endedAt: event.endedAt,
    }),
  fromChange: (change) =>
    withoutUndefined({
      id: change.clientId,
      name: change.name,
      startedAt: change.startedAt,
      endedAt: change.endedAt,
    }),
};
