import type { api } from '@bankstats/convex/convex/_generated/api';
import { financialAccountChangeProblem } from '@bankstats/convex/convex/changeRules';
import type { FunctionArgs, FunctionReturnType } from 'convex/server';

import {
  financialAccountBank,
  type FinancialAccount,
} from '@/features/financial-accounts/financial-account';

import type { SyncCodec } from './sync-plan';

export type PushedAccount = FunctionArgs<typeof api.financialAccounts.push>['changes'][number];

export type AccountChange = Omit<PushedAccount, 'revision' | 'deleted'>;

export type RemoteAccount = FunctionReturnType<typeof api.financialAccounts.list>[number];

export const accountCodec: SyncCodec<FinancialAccount, AccountChange> = {
  includes: () => true,
  idOf: (account) => account.id,
  toChange: (account) => ({
    clientId: account.id,
    bank: account.bank,
    name: account.name,
    isGeneral: account.isGeneral,
  }),
  fromChange: (change) => ({
    id: change.clientId,
    bank: financialAccountBank(change.bank),
    name: change.name,
    isGeneral: change.isGeneral,
  }),
  isPushable: (change) => financialAccountChangeProblem(change) === null,
};
