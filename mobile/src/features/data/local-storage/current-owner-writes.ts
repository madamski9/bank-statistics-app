import { openLocalDataSession, type LocalDataSession } from './local-data-session';
import { queueLocalWrite } from './local-write-queue';

export function withCurrentOwner<Result>(
  work: (write: LocalDataSession['write']) => Promise<Result>,
): Promise<Result> {
  const session = openLocalDataSession();

  return queueLocalWrite(() => {
    session.assertCurrent();

    return work(session.write);
  });
}

export function writeForCurrentOwner<Result>(change: () => Promise<Result>): Promise<Result> {
  return withCurrentOwner((write) => write(change));
}

export function saveForCurrentOwner<Item>(
  items: readonly Item[],
  save: (item: Item) => Promise<unknown>,
): Promise<void> {
  return withCurrentOwner(async (write) => {
    for (const item of items) {
      await write(() => save(item));
    }
  });
}
