import { describe, expect, test } from 'bun:test';

import { clearLocalDataWith } from './clear-local-data-boundary';
import { StaleLocalDataError } from './local-data-session';
import { saveForCurrentOwner, withCurrentOwner, writeForCurrentOwner } from './current-owner-writes';

describe('current owner writes', () => {
  test('stops saving the previous owner’s rows once the local data is cleared mid import', async () => {
    const outbox: string[] = [];
    let resumeFirstSave: () => void = () => undefined;
    let firstSaveStarted: () => void = () => undefined;
    const started = new Promise<void>((resolve) => {
      firstSaveStarted = resolve;
    });

    const importing = saveForCurrentOwner(['alice-one', 'alice-two'], async (id) => {
      if (id === 'alice-one') {
        firstSaveStarted();
        await new Promise<void>((resolve) => {
          resumeFirstSave = resolve;
        });
      }
      outbox.push(id);
    });

    await started;
    const cleared = clearLocalDataWith(async () => {
      outbox.length = 0;
    });
    resumeFirstSave();

    await expect(importing).rejects.toThrow(StaleLocalDataError);
    await cleared;
    expect(outbox).toEqual([]);
  });

  test('saves every row while the owner stays the same', async () => {
    const outbox: string[] = [];

    await saveForCurrentOwner(['a', 'b'], async (id) => {
      outbox.push(id);
    });

    expect(outbox).toEqual(['a', 'b']);
  });

  test('drops work started for the previous owner whose read finished after the phone was cleared', async () => {
    const stored: string[] = [];
    let finishRead: () => void = () => undefined;
    let readStarted: () => void = () => undefined;
    const reading = new Promise<void>((resolve) => {
      readStarted = resolve;
    });

    const starting = withCurrentOwner(async (write) => {
      readStarted();
      await new Promise<void>((resolve) => {
        finishRead = resolve;
      });
      await write(async () => stored.push('Alice private trip'));
    });

    await reading;
    const cleared = clearLocalDataWith(async () => {
      stored.length = 0;
    });
    finishRead();

    await expect(starting).rejects.toThrow(StaleLocalDataError);
    await cleared;
    expect(stored).toEqual([]);
  });

  test('drops an edit that was waiting in the queue when the phone was cleared', async () => {
    const stored: string[] = [];
    let releaseQueue: () => void = () => undefined;
    let queueBlocked: () => void = () => undefined;
    const isBlocked = new Promise<void>((resolve) => {
      queueBlocked = resolve;
    });
    const blocking = withCurrentOwner(
      () =>
        new Promise<void>((resolve) => {
          releaseQueue = resolve;
          queueBlocked();
        }),
    );
    await isBlocked;

    const edit = writeForCurrentOwner(async () => stored.push('alice-edit'));
    const cleared = clearLocalDataWith(async () => {
      stored.length = 0;
    });
    releaseQueue();

    await blocking;
    await expect(edit).rejects.toThrow(StaleLocalDataError);
    await cleared;
    expect(stored).toEqual([]);
  });
});

