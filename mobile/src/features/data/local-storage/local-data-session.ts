export class StaleLocalDataError extends Error {
  constructor() {
    super('Local data changed hands while this task was running.');
    this.name = 'StaleLocalDataError';
  }
}

export interface LocalDataSession {
  assertCurrent: () => void;
  write: <Result>(change: () => Promise<Result>) => Promise<Result>;
}

let generation = 0;
const pendingWrites = new Set<Promise<unknown>>();

export function openLocalDataSession(isStillValid: () => boolean = () => true): LocalDataSession {
  const openedAt = generation;

  const assertCurrent = () => {
    if (generation !== openedAt || !isStillValid()) {
      throw new StaleLocalDataError();
    }
  };

  return {
    assertCurrent,
    write: (change) => {
      assertCurrent();
      const written = change();
      pendingWrites.add(written);
      void written.then(
        () => pendingWrites.delete(written),
        () => pendingWrites.delete(written),
      );

      return written;
    },
  };
}

export async function endLocalDataSessions(): Promise<void> {
  generation += 1;

  while (pendingWrites.size > 0) {
    await Promise.allSettled([...pendingWrites]);
  }
}
