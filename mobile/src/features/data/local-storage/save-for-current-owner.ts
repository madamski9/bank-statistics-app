import { openLocalDataSession } from './local-data-session';
import { queueLocalWrite } from './local-write-queue';

export function saveForCurrentOwner<Item>(
  items: readonly Item[],
  save: (item: Item) => Promise<unknown>,
): Promise<void> {
  const session = openLocalDataSession();

  return queueLocalWrite(async () => {
    for (const item of items) {
      await session.write(() => save(item));
    }
  });
}
