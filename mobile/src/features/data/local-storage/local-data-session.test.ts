import { describe, expect, test } from 'bun:test';

import {
  endLocalDataSessions,
  openLocalDataScope,
  openLocalDataSession,
  StaleLocalDataError,
} from './local-data-session';

describe('local data session', () => {
  test('refuses writes once the local data was handed to someone else', async () => {
    const session = openLocalDataSession();
    const writes: string[] = [];

    await session.write(async () => writes.push('before'));
    await endLocalDataSessions();

    expect(() => session.write(async () => writes.push('after'))).toThrow(StaleLocalDataError);
    expect(() => session.assertCurrent()).toThrow(StaleLocalDataError);
    expect(writes).toEqual(['before']);
  });

  test('waits for writes already in progress before the data changes hands', async () => {
    const session = openLocalDataSession();
    const order: string[] = [];
    let finish: () => void = () => undefined;
    const inProgress = session.write(
      () =>
        new Promise<void>((resolve) => {
          finish = () => {
            order.push('write');
            resolve();
          };
        }),
    );

    const ended = endLocalDataSessions().then(() => order.push('ended'));
    finish();
    await Promise.all([inProgress, ended]);

    expect(order).toEqual(['write', 'ended']);
  });

  test('stops a session whose owner is no longer signed in', () => {
    let isSignedIn = true;
    const session = openLocalDataSession(() => isSignedIn);

    session.assertCurrent();
    isSignedIn = false;

    expect(() => session.assertCurrent()).toThrow(StaleLocalDataError);
  });

  test('stops every session of a scope once it closes, without another render', async () => {
    const scope = openLocalDataScope();
    const running = scope.open();

    await running.write(async () => 'saved');
    scope.close();

    expect(() => running.assertCurrent()).toThrow(StaleLocalDataError);
    expect(() => scope.open().assertCurrent()).toThrow(StaleLocalDataError);
    expect(() => openLocalDataScope().open().assertCurrent()).not.toThrow();
  });

  test('lets a session opened after the handover write', async () => {
    await endLocalDataSessions();
    const session = openLocalDataSession();

    expect(await session.write(async () => 'saved')).toBe('saved');
  });
});
