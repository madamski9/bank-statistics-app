import { describe, expect, test } from 'bun:test';

import { documentList, UnreadableDocumentError } from './document-list';

function memoryStorage(initial: string | null = null) {
  let value = initial;

  return {
    read: async () => value,
    write: async (next: string) => {
      value = next;
    },
    current: () => value,
  };
}

function isNamed(value: unknown): value is { id: string; name: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { id?: unknown }).id === 'string' &&
    typeof (value as { name?: unknown }).name === 'string'
  );
}

describe('document list', () => {
  test('applies concurrent writes one after another', async () => {
    const storage = memoryStorage();
    const list = documentList(storage, isNamed);

    await Promise.all([
      list.upsert({ id: 'a', name: 'A' }),
      list.upsert({ id: 'b', name: 'B' }),
      list.upsert({ id: 'a', name: 'A2' }),
    ]);
    await list.remove('b');

    expect(await list.load()).toEqual([{ id: 'a', name: 'A2' }]);
  });

  test('reads an unreadable document as empty and skips malformed items', async () => {
    expect(await documentList(memoryStorage('{oops'), isNamed).load()).toEqual([]);
    expect(
      await documentList(memoryStorage('[{"id":"a","name":"A"},{"id":1}]'), isNamed).load(),
    ).toEqual([{ id: 'a', name: 'A' }]);
  });

  test('tells a missing or empty document apart from one it cannot read', async () => {
    expect(await documentList(memoryStorage(), isNamed).read()).toEqual([]);
    expect(await documentList(memoryStorage('[]'), isNamed).read()).toEqual([]);
    await expect(documentList(memoryStorage('{broken'), isNamed).read()).rejects.toThrow(UnreadableDocumentError);
    await expect(documentList(memoryStorage('{"id":"a"}'), isNamed).read()).rejects.toThrow(UnreadableDocumentError);
    await expect(
      documentList(
        {
          read: async () => {
            throw new Error('database is locked');
          },
          write: async () => undefined,
        },
        isNamed,
      ).read(),
    ).rejects.toThrow('locked');
  });

  test('never overwrites a document it cannot parse', async () => {
    const storage = memoryStorage('{broken');
    const list = documentList(storage, isNamed);

    await expect(list.upsert({ id: 'b', name: 'B' })).rejects.toThrow(UnreadableDocumentError);
    await expect(list.remove('a')).rejects.toThrow(UnreadableDocumentError);

    expect(storage.current()).toBe('{broken');
  });

  test('keeps the stored list when reading it fails during a write', async () => {
    let value: string | null = '[{"id":"a","name":"A"}]';
    let failRead = true;
    const list = documentList(
      {
        read: async () => {
          if (failRead) {
            throw new Error('locked');
          }

          return value;
        },
        write: async (next: string) => {
          value = next;
        },
      },
      isNamed,
    );

    await expect(list.upsert({ id: 'b', name: 'B' })).rejects.toThrow('locked');
    expect(value).toBe('[{"id":"a","name":"A"}]');

    failRead = false;
    await list.upsert({ id: 'b', name: 'B' });

    expect(await list.load()).toEqual([
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B' },
    ]);
  });
});
