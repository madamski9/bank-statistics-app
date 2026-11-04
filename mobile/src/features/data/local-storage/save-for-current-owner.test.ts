import { describe, expect, test } from 'bun:test';

import { clearLocalDataWith } from './clear-local-data-boundary';
import { StaleLocalDataError } from './local-data-session';
import { saveForCurrentOwner } from './save-for-current-owner';

describe('saveForCurrentOwner', () => {
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
});
