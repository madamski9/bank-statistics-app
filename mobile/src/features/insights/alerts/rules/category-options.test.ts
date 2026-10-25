import { afterEach, describe, expect, test } from 'bun:test';

import { setCustomCategories } from '@/features/data/classification/categories';

import { categoryScopeOptions } from './category-options';

afterEach(() => setCustomCategories([]));

describe('categoryScopeOptions', () => {
  test('offers every built-in category without uncategorized', () => {
    const options = categoryScopeOptions(false, { kind: 'all' });

    expect(options.map((option) => option.scope.id)).toEqual([
      'groceries',
      'eatingOut',
      'transport',
      'health',
      'home',
      'clothing',
      'entertainment',
      'services',
      'transfers',
      'other',
    ]);
    expect(options.every((option) => option.scope.kind === 'category')).toBe(true);
  });

  test('adds custom categories only when they are available', () => {
    setCustomCategories([{ id: 'category-pets', name: 'Zwierzęta' }]);

    expect(categoryScopeOptions(false, { kind: 'all' }).some((option) => option.scope.id === 'category-pets')).toBe(
      false,
    );
    expect(categoryScopeOptions(true, { kind: 'all' }).at(-1)).toEqual({
      scope: { kind: 'category', id: 'category-pets' },
      label: 'Zwierzęta',
    });
  });

  test('keeps the category of the edited limit even when it is no longer offered', () => {
    setCustomCategories([{ id: 'category-pets', name: 'Zwierzęta' }]);

    expect(categoryScopeOptions(false, { kind: 'category', id: 'category-pets' })[0]).toEqual({
      scope: { kind: 'category', id: 'category-pets' },
      label: 'Zwierzęta',
    });
  });

  test('labels the category of a limit whose custom category was deleted as deleted, not uncategorized', () => {
    const [first] = categoryScopeOptions(true, { kind: 'category', id: 'category-gone' });

    expect(first.scope.id).toBe('category-gone');
    expect(first.label).toBe('Usunięta kategoria');
  });
});
