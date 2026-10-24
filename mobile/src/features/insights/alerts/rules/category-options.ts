import { categoryLabel, categoryOptions, isCustomCategoryId } from '@/features/data/classification/categories';

import type { AlertScope } from './alert-rule';

export type CategoryScope = Extract<AlertScope, { kind: 'category' }>;

export interface CategoryScopeOption {
  scope: CategoryScope;
  label: string;
}

export function categoryScopeOptions(
  includesCustom: boolean,
  initialScope: AlertScope,
): CategoryScopeOption[] {
  const options = categoryOptions()
    .filter((option) => includesCustom || !isCustomCategoryId(option.id))
    .map((option) => ({ scope: { kind: 'category' as const, id: option.id }, label: option.label }));

  if (initialScope.kind !== 'category' || options.some((option) => option.scope.id === initialScope.id)) {
    return options;
  }

  return [{ scope: initialScope, label: categoryLabel(initialScope.id) }, ...options];
}
