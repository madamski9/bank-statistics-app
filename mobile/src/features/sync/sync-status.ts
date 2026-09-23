export type SyncState = 'waiting' | 'syncing' | 'synced' | 'offline' | 'failed';

export interface SyncStatus {
  state: SyncState;
  lastSyncedAt: number | null;
}

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

  return isToday
    ? `o ${clockTime(moment)}`
    : `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')} o ${clockTime(moment)}`;
}

export function syncStatusLabel(status: SyncStatus, now: number): string {
  switch (status.state) {
    case 'synced':
      return status.lastSyncedAt === null
        ? 'Zsynchronizowano'
        : `Zsynchronizowano ${dayLabel(status.lastSyncedAt, now)}`;
    case 'offline':
      return 'Offline. Zsynchronizujemy po powrocie sieci.';
    case 'failed':
      return 'Nie udało się zsynchronizować. Spróbujemy ponownie.';
    case 'syncing':
      return 'Synchronizowanie…';
    case 'waiting':
      return 'Łączenie…';
  }
}
