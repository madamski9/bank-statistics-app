import { describe, expect, test } from 'bun:test';

import { syncStatusLabel } from './sync-status';

const noon = new Date(2026, 8, 23, 12, 0).getTime();

describe('syncStatusLabel', () => {
  test('names the time of the last synchronization', () => {
    expect(syncStatusLabel({ state: 'synced', lastSyncedAt: noon - 60_000 }, noon)).toBe(
      'Zsynchronizowano o 11:59',
    );
  });

  test('says that synchronization resumes once the network returns', () => {
    expect(syncStatusLabel({ state: 'offline', lastSyncedAt: null }, noon)).toBe(
      'Offline. Zsynchronizujemy po powrocie sieci.',
    );
  });

  test('says a failed attempt will be retried without blaming the user', () => {
    expect(syncStatusLabel({ state: 'failed', lastSyncedAt: null }, noon)).toBe(
      'Nie udało się zsynchronizować. Spróbujemy ponownie.',
    );
  });

  test('covers waiting and an attempt in progress', () => {
    expect(syncStatusLabel({ state: 'waiting', lastSyncedAt: null }, noon)).toBe('Łączenie…');
    expect(syncStatusLabel({ state: 'syncing', lastSyncedAt: null }, noon)).toBe('Synchronizowanie…');
  });
});
