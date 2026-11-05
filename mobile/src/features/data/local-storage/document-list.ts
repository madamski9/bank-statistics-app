import type { DocumentStorage } from './encrypted-document';

export interface DocumentList<Item> {
  load: () => Promise<Item[]>;
  read: () => Promise<Item[]>;
  upsert: (item: Item) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export class UnreadableDocumentError extends Error {
  constructor() {
    super('The stored document could not be read.');
    this.name = 'UnreadableDocumentError';
  }
}

export function parseDocumentList<Item>(stored: string | null, isItem: (value: unknown) => value is Item): Item[] {
  if (stored === null) {
    return [];
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(stored);
  } catch {
    throw new UnreadableDocumentError();
  }

  if (!Array.isArray(parsed)) {
    throw new UnreadableDocumentError();
  }

  return parsed.filter(isItem);
}

export function documentList<Item extends { id: string }>(
  storage: DocumentStorage,
  isItem: (value: unknown) => value is Item,
): DocumentList<Item> {
  let pending: Promise<unknown> = Promise.resolve();

  const read = async (): Promise<Item[]> => parseDocumentList(await storage.read(), isItem);

  const load = async (): Promise<Item[]> => {
    try {
      return await read();
    } catch {
      return [];
    }
  };

  const update = (change: (items: Item[]) => Item[]): Promise<void> => {
    const next = pending
      .catch(() => undefined)
      .then(async () => storage.write(JSON.stringify(change(await read()))));

    pending = next;

    return next;
  };

  return {
    load,
    read,
    upsert: (item) =>
      update((items) =>
        items.some((candidate) => candidate.id === item.id)
          ? items.map((candidate) => (candidate.id === item.id ? item : candidate))
          : [...items, item],
      ),
    remove: (id) => update((items) => items.filter((item) => item.id !== id)),
  };
}
