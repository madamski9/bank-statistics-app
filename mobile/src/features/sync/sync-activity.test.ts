import { describe, expect, test } from 'bun:test';

import { trackSyncRun, waitForActiveSync } from './sync-activity';

describe('sync activity', () => {
  test('waits for a running sync before cloud deletion may start', async () => {
    let finishRun: (() => void) | undefined;
    const run = new Promise<void>((resolve) => {
      finishRun = resolve;
    });
    trackSyncRun(run);
    let deletionMayStart = false;
    const wait = waitForActiveSync().then(() => {
      deletionMayStart = true;
    });

    await Promise.resolve();
    expect(deletionMayStart).toBe(false);

    finishRun?.();
    await wait;
    expect(deletionMayStart).toBe(true);
  });

  test('does not block deletion after a failed sync has settled', async () => {
    const run = Promise.reject(new Error('offline'));
    trackSyncRun(run);
    await expect(run).rejects.toThrow('offline');
    await waitForActiveSync();
  });
});
