import { describe, expect, test } from 'bun:test';

import {
  categoryLabel,
  categoryOptions,
  suggestedCategory,
  uncategorizedCategory,
} from './categories';

describe('categories', () => {
  test('suggests a category for a shop the catalog knows', () => {
    expect(suggestedCategory('Żabka')).toBe('groceries');
    expect(suggestedCategory('Orlen')).toBe('transport');
  });

  test('suggests nothing for a shop nobody has classified', () => {
    expect(suggestedCategory('Latto Gelato')).toBeNull();
  });

  test('names a category in Polish and falls back for an unknown one', () => {
    expect(categoryLabel('groceries')).toBe('Zakupy spożywcze');
    expect(categoryLabel(undefined)).toBe('Bez kategorii');
    expect(categoryLabel(uncategorizedCategory)).toBe('Bez kategorii');
    expect(categoryLabel('a-category-we-dropped')).toBe('a-category-we-dropped');
  });

  test('offers every catalog category for a correction', () => {
    expect(categoryOptions().map((option) => option.id)).toContain('groceries');
    expect(categoryOptions().every((option) => option.label !== '')).toBe(true);
  });
});
