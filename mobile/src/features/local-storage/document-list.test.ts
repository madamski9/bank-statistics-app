import { describe, expect, test } from 'bun:test';

import { documentList } from './document-list';

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
});
