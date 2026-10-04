import type { api } from '@bankstats/convex/convex/_generated/api';
import { categoryChangeProblem } from '@bankstats/convex/convex/changeRules';
import type { FunctionArgs, FunctionReturnType } from 'convex/server';

import type { CustomCategory } from '@/features/classification/categories';

import type { SyncCodec } from './sync-plan';

export type PushedCategory = FunctionArgs<typeof api.categories.push>['changes'][number];

export type CategoryChange = Omit<PushedCategory, 'revision' | 'deleted'>;

export type RemoteCategory = FunctionReturnType<typeof api.categories.list>[number];

export const categoryCodec: SyncCodec<CustomCategory, CategoryChange> = {
  includes: () => true,
  idOf: (category) => category.id,
  toChange: (category) => ({ clientId: category.id, name: category.name }),
  fromChange: (change) => ({ id: change.clientId, name: change.name }),
  isPushable: (change) => categoryChangeProblem(change) === null,
};
