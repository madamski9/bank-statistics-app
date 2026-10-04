import { currentCopy, defineCopy } from '@/features/localization/language';

export type SyncState = 'waiting' | 'syncing' | 'synced' | 'offline' | 'failed' | 'disabled';

export interface SyncStatus {
  state: SyncState;
  lastSyncedAt: number | null;
}

const syncCopy = defineCopy({
  pl: {
    at: (time: string) => `o ${time}`,
    onDayAt: (day: string, time: string) => `${day} o ${time}`,
    synced: 'Zsynchronizowano',
    syncedWhen: (when: string) => `Zsynchronizowano ${when}`,
    offline: 'Offline. Zsynchronizujemy po powrocie sieci.',
    failed: 'Nie udało się zsynchronizować. Spróbujemy ponownie.',
    syncing: 'Synchronizowanie…',
    waiting: 'Łączenie…',
    disabled: 'Wyłączona. Dane zostają tylko na tym telefonie.',
  },
  en: {
    at: (time: string) => `at ${time}`,
    onDayAt: (day: string, time: string) => `${day} at ${time}`,
    synced: 'Synced',
    syncedWhen: (when: string) => `Synced ${when}`,
    offline: 'Offline. We will sync when you are back online.',
    failed: 'Could not sync. We will try again.',
    syncing: 'Syncing…',
    waiting: 'Connecting…',
    disabled: 'Off. Your data stays on this phone only.',
  },
});

function clockTime(moment: number): string {
  const date = new Date(moment);

  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function dayLabel(moment: number, now: number): string {
  const date = new Date(moment);
  const today = new Date(now);
  const isToday =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();

  const copy = currentCopy(syncCopy);

  return isToday
    ? copy.at(clockTime(moment))
    : copy.onDayAt(
        `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}`,
        clockTime(moment),
      );
}

export function syncStatusLabel(status: SyncStatus, now: number): string {
  const copy = currentCopy(syncCopy);

  switch (status.state) {
    case 'synced':
      return status.lastSyncedAt === null
        ? copy.synced
        : copy.syncedWhen(dayLabel(status.lastSyncedAt, now));
    case 'offline':
      return copy.offline;
    case 'failed':
      return copy.failed;
    case 'syncing':
      return copy.syncing;
    case 'waiting':
      return copy.waiting;
    case 'disabled':
      return copy.disabled;
  }
}
