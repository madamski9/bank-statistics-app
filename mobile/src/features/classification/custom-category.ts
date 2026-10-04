import { currentCopy, defineCopy } from '@/features/localization/language';

import { builtInCategoryLabels, type CustomCategory } from './categories';

export const maximumCategoryNameLength = 40;

const customCategoryCopy = defineCopy({
  pl: {
    enterName: 'Podaj nazwę kategorii.',
    nameTooLong: (limit: number) => `Nazwa może mieć najwyżej ${limit} znaków.`,
    duplicateName: 'Taka kategoria już istnieje.',
  },
  en: {
    enterName: 'Enter a category name.',
    nameTooLong: (limit: number) => `The name can have at most ${limit} characters.`,
    duplicateName: 'This category already exists.',
  },
});

export function isCustomCategory(value: unknown): value is CustomCategory {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<CustomCategory>;

  return typeof candidate.id === 'string' && typeof candidate.name === 'string';
}

export function newCustomCategory(name: string, now: Date, random: () => number): CustomCategory {
  const suffix = Math.floor(random() * 0xffffff)
    .toString(36)
    .padStart(5, '0');

  return { id: `category-${now.getTime().toString(36)}-${suffix}`, name: name.trim() };
}

export function customCategoryNameError(
  name: string,
  existing: CustomCategory[],
  editedId: string | null = null,
): string | null {
  const copy = currentCopy(customCategoryCopy);
  const trimmed = name.trim();

  if (trimmed === '') {
    return copy.enterName;
  }

  if (trimmed.length > maximumCategoryNameLength) {
    return copy.nameTooLong(maximumCategoryNameLength);
  }

  const lowered = trimmed.toLocaleLowerCase('pl');
  const taken = [
    ...builtInCategoryLabels(),
    ...existing.filter((category) => category.id !== editedId).map((category) => category.name),
  ];

  return taken.some((label) => label.toLocaleLowerCase('pl') === lowered) ? copy.duplicateName : null;
}
