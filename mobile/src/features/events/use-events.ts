import { useCallback, useEffect, useState } from 'react';

import { nextEventColor } from './event-colors';
import { eventStore } from './event-storage';
import { endedEvent, newSpendingEvent, type SpendingEvent } from './spending-event';

export interface SpendingEvents {
  events: SpendingEvent[];
  start: (name: string) => Promise<SpendingEvent>;
  end: (event: SpendingEvent) => Promise<void>;
  save: (event: SpendingEvent) => Promise<void>;
  remove: (id: string) => Promise<void>;
  reload: () => Promise<void>;
}

export function useEvents(): SpendingEvents {
  const [events, setEvents] = useState<SpendingEvent[]>([]);

  const reload = useCallback(async () => {
    setEvents(await eventStore.load());
  }, []);

  useEffect(() => {
    let isActive = true;

    void eventStore.load().then((stored) => {
      if (isActive) {
        setEvents(stored);
      }
    });

    return () => {
      isActive = false;
    };
  }, []);

  const save = useCallback(
    async (event: SpendingEvent) => {
      await eventStore.upsert(event);
      await reload();
    },
    [reload],
  );

  const end = useCallback((event: SpendingEvent) => save(endedEvent(event, new Date())), [save]);

  const start = useCallback(
    async (name: string) => {
      const now = new Date();

      const stored = await eventStore.load();

      for (const running of stored.filter((event) => event.endedAt === undefined)) {
        await eventStore.upsert(endedEvent(running, now));
      }

      const event = newSpendingEvent(name, now, Math.random, nextEventColor(stored));
      await save(event);

      return event;
    },
    [save],
  );

  const remove = useCallback(
    async (id: string) => {
      await eventStore.remove(id);
      await reload();
    },
    [reload],
  );

  return { events, start, end, save, remove, reload };
}
