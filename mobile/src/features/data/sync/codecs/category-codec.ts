import { categoryChangeProblem } from '@bankstats/convex/convex/changeRules';
import type { CategoryContent } from '@bankstats/convex/convex/sync';

import type { CustomCategory } from '@/features/data/classification/categories';

import type { SyncCodec, SyncedChange } from '../engine/sync-plan';

export type CategoryChange = CategoryContent;

export type RemoteCategory = SyncedChange<CategoryChange>;

export const categoryCodec: SyncCodec<CustomCategory, CategoryChange> = {
  includes: () => true,
  idOf: (category) => category.id,
  toChange: (category) => ({ clientId: category.id, name: category.name }),
  fromChange: (change) => ({ id: change.clientId, name: change.name }),
  isPushable: (change) => categoryChangeProblem(change) === null,
};
