import type { Language } from '@/features/app-shell/localization/language';
import { categoryOptions, isCustomCategoryId } from '@/features/data/classification/categories';

import { categoryScopeLabel } from '../delivery/alert-message';
import type { AlertScope } from './alert-rule';

export type CategoryScope = Extract<AlertScope, { kind: 'category' }>;

export interface CategoryScopeOption {
  scope: CategoryScope;
  label: string;
}

export function categoryScopeOptions(
  includesCustom: boolean,
  initialScope: AlertScope,
  language?: Language,
): CategoryScopeOption[] {
  const options = categoryOptions(language)
    .filter((option) => includesCustom || !isCustomCategoryId(option.id))
    .map((option) => ({ scope: { kind: 'category' as const, id: option.id }, label: option.label }));

  if (initialScope.kind !== 'category' || options.some((option) => option.scope.id === initialScope.id)) {
    return options;
  }

  return [{ scope: initialScope, label: categoryScopeLabel(initialScope.id) }, ...options];
}
