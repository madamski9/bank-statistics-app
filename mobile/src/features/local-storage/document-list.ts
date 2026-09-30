import type { DocumentStorage } from './encrypted-document';

export interface DocumentList<Item> {
  load: () => Promise<Item[]>;
  upsert: (item: Item) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export function documentList<Item extends { id: string }>(
  storage: DocumentStorage,
  isItem: (value: unknown) => value is Item,
): DocumentList<Item> {
  let pending: Promise<unknown> = Promise.resolve();

  const load = async (): Promise<Item[]> => {
    try {
      const stored = await storage.read();

      if (stored === null) {
        return [];
      }

      const parsed: unknown = JSON.parse(stored);

      return Array.isArray(parsed) ? parsed.filter(isItem) : [];
    } catch {
      return [];
    }
  };

  const update = (change: (items: Item[]) => Item[]): Promise<void> => {
    const next = pending
      .catch(() => undefined)
      .then(async () => storage.write(JSON.stringify(change(await load()))));

    pending = next;

    return next;
  };

  return {
    load,
    upsert: (item) =>
      update((items) =>
        items.some((candidate) => candidate.id === item.id)
          ? items.map((candidate) => (candidate.id === item.id ? item : candidate))
          : [...items, item],
      ),
    remove: (id) => update((items) => items.filter((item) => item.id !== id)),
  };
}
