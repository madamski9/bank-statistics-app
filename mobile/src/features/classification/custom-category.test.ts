import type { IngestionRecord } from '@bankstats/ingestion-native';
import { afterEach, describe, expect, test } from 'bun:test';

import { categoryLabel, categoryOptions, setCustomCategories, uncategorizedLabel } from './categories';
import { classifyTransaction } from './classify-transaction';
import { customCategoryNameError, newCustomCategory } from './custom-category';

const hobby = { id: 'category-hobby', name: 'Hobby' };

function purchase(category?: string): IngestionRecord {
  return {
    id: 'lego',
    bank: 'manual',
    direction: 'expense',
    amountMinor: 19_900,
    currency: 'PLN',
    merchant: 'Lego',
    category,
    occurredAt: '2026-09-01T10:00:00Z',
    capturedAt: '2026-09-01T10:00:00Z',
    sourceApp: 'manual',
    status: 'posted',
    origin: 'manual',
  };
}

afterEach(() => setCustomCategories([]));

describe('custom categories', () => {
  test('offers a custom category next to the built-in ones and labels it', () => {
    setCustomCategories([hobby]);

    expect(categoryOptions().at(-1)).toEqual({ id: 'category-hobby', label: 'Hobby' });
    expect(categoryLabel('category-hobby')).toBe('Hobby');
    expect(classifyTransaction(purchase('category-hobby'), []).categoryName).toBe('Hobby');
  });

  test('falls back to automatic recognition once a custom category is deleted', () => {
    const classified = classifyTransaction(purchase('category-hobby'), []);

    expect(categoryLabel('category-hobby')).toBe(uncategorizedLabel());
    expect(classified.category).toBe('entertainment');
  });

  test('refuses an empty, too long or duplicate name', () => {
    expect(customCategoryNameError(' ', [])).not.toBeNull();
    expect(customCategoryNameError('x'.repeat(41), [])).not.toBeNull();
    expect(customCategoryNameError('hobby', [hobby])).not.toBeNull();
    expect(customCategoryNameError('Rozrywka', [])).not.toBeNull();
    expect(customCategoryNameError('Hobby', [hobby], hobby.id)).toBeNull();
  });

  test('creates an identifier the backend accepts', () => {
    const category = newCustomCategory('  Zwierzęta ', new Date(1_800_000_000_000), () => 0.5);

    expect(category.name).toBe('Zwierzęta');
    expect(category.id).toMatch(/^category-[a-z0-9-]{1,60}$/);
  });
});
